-- BotMart schema — run in the Supabase SQL editor

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id text,
  description text,
  budget numeric default 1000,
  spent numeric default 0,
  policy jsonb default '{}',
  reputation numeric default 50,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_agent_id uuid references agents(id),
  title text not null,
  description text,
  price numeric not null,
  category text,
  stock integer default 1,
  terms jsonb default '{}',
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists negotiations (
  id uuid primary key default gen_random_uuid(),
  buyer_agent_id uuid references agents(id),
  seller_agent_id uuid references agents(id),
  listing_id uuid references listings(id),
  status text default 'open',
  current_offer numeric,
  messages jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid references negotiations(id),
  buyer_agent_id uuid references agents(id),
  seller_agent_id uuid references agents(id),
  listing_id uuid references listings(id),
  final_price numeric,
  status text default 'pending',
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);

alter table orders add column if not exists stripe_payment_intent_id text;

-- Indexes to keep listing/negotiation/order lookups fast as data grows.
create index if not exists idx_listings_seller_agent_id on listings (seller_agent_id);
create index if not exists idx_listings_status on listings (status);
create index if not exists idx_negotiations_buyer_agent_id on negotiations (buyer_agent_id);
create index if not exists idx_negotiations_seller_agent_id on negotiations (seller_agent_id);
create index if not exists idx_negotiations_listing_id on negotiations (listing_id);
create index if not exists idx_negotiations_status on negotiations (status);
create index if not exists idx_orders_negotiation_id on orders (negotiation_id);
create index if not exists idx_orders_buyer_agent_id on orders (buyer_agent_id);
create index if not exists idx_orders_seller_agent_id on orders (seller_agent_id);

-- Row Level Security
-- Agents are owned by a Supabase auth user: owner_id stores auth.uid() (as text)
-- once a user signs up and creates an agent. All application writes go through
-- the server using the service role key (see src/lib/supabase/admin.ts), which
-- bypasses RLS entirely — the API routes themselves check auth.getUser() and
-- scope every query by owner_id. RLS here is defense in depth for the anon/
-- authenticated keys, and keeps the marketplace's "read is public" model:
-- anyone can browse agents/listings/negotiations/orders, but only the owning
-- user (or the server) can mutate an agent.
alter table agents enable row level security;
alter table listings enable row level security;
alter table negotiations enable row level security;
alter table orders enable row level security;

drop policy if exists "agents_public_read" on agents;
create policy "agents_public_read" on agents for select using (true);

drop policy if exists "listings_public_read" on listings;
create policy "listings_public_read" on listings for select using (true);

drop policy if exists "negotiations_public_read" on negotiations;
create policy "negotiations_public_read" on negotiations for select using (true);

drop policy if exists "orders_public_read" on orders;
create policy "orders_public_read" on orders for select using (true);

-- Authenticated users may only create/modify/delete their own agents.
drop policy if exists "agents_insert_own" on agents;
create policy "agents_insert_own" on agents
  for insert with check (auth.uid()::text = owner_id);

drop policy if exists "agents_update_own" on agents;
create policy "agents_update_own" on agents
  for update using (auth.uid()::text = owner_id);

drop policy if exists "agents_delete_own" on agents;
create policy "agents_delete_own" on agents
  for delete using (auth.uid()::text = owner_id);

-- listings/negotiations/orders have no insert/update/delete policy for the
-- anon/authenticated roles, so those writes stay denied by default under RLS.
-- The service role key used by createAdminClient() bypasses RLS and remains
-- the write path for those tables (the marketplace engine, not end users).

-- Realtime
-- Broadcast row changes so the negotiate page can watch a negotiation update
-- live (from any tab/session) and the landing page can stream new deals into
-- the activity feed as they close, both via @supabase/ssr's postgres_changes.
alter publication supabase_realtime add table negotiations;
alter publication supabase_realtime add table orders;
