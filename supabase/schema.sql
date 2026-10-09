-- BotMart full schema — run in Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

create extension if not exists "pgcrypto";

-- ─── Agents ───────────────────────────────────────────────
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
  goal text,
  memory jsonb default '[]',
  trades_completed integer default 0,
  trades_failed integer default 0,
  world_x numeric,
  world_z numeric,
  world_activity text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table agents add column if not exists goal text;
alter table agents add column if not exists memory jsonb default '[]';
alter table agents add column if not exists trades_completed integer default 0;
alter table agents add column if not exists trades_failed integer default 0;
alter table agents add column if not exists updated_at timestamptz default now();
alter table agents add column if not exists world_x numeric;
alter table agents add column if not exists world_z numeric;
alter table agents add column if not exists world_activity text;

-- ─── Listings ─────────────────────────────────────────────
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_agent_id uuid references agents(id) on delete set null,
  title text not null,
  description text,
  price numeric not null,
  category text,
  stock integer default 1,
  terms jsonb default '{}',
  status text default 'active',
  world_x numeric,
  world_z numeric,
  created_at timestamptz default now()
);

alter table listings add column if not exists world_x numeric;
alter table listings add column if not exists world_z numeric;

-- ─── Negotiations ─────────────────────────────────────────
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

-- ─── Orders ───────────────────────────────────────────────
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

-- ─── Decision log (observability) ─────────────────────────
create table if not exists agent_decisions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade,
  negotiation_id uuid references negotiations(id) on delete set null,
  role text,
  action_type text,
  payload jsonb default '{}',
  source text default 'rules',
  created_at timestamptz default now()
);

-- ─── Indexes ──────────────────────────────────────────────
create index if not exists idx_listings_status on listings(status);
create index if not exists idx_listings_seller on listings(seller_agent_id);
create index if not exists idx_negotiations_status on negotiations(status);
create index if not exists idx_agents_owner on agents(owner_id);
create index if not exists idx_agents_status on agents(status);
create index if not exists idx_decisions_agent on agent_decisions(agent_id);
