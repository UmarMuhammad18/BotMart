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

-- ─── Approvals & notifications ────────────────────────────
-- Agents with an owner can be set to ask before buying: the negotiation
-- pauses as 'awaiting_approval' and the owner gets a notification.
alter table negotiations add column if not exists approval_requested_at timestamptz;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  agent_id uuid references agents(id) on delete cascade,
  negotiation_id uuid references negotiations(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  data jsonb default '{}',
  read_at timestamptz,
  created_at timestamptz default now()
);

-- ─── Rate limits (shared across serverless instances) ─────
create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

create or replace function hit_rate_limit(p_key text, p_window_seconds integer)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case
      when rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else rate_limits.count + 1
    end,
    window_start = case
      when rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else rate_limits.window_start
    end
  returning count into v_count;
  return v_count;
end;
$$;

-- ─── Daily LLM spend ──────────────────────────────────────
create table if not exists llm_usage (
  day date primary key,
  calls integer not null default 0,
  tokens integer not null default 0
);

create or replace function bump_llm_usage(p_tokens integer)
returns table (calls integer, tokens integer)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  insert into llm_usage as u (day, calls, tokens)
  values ((now() at time zone 'utc')::date, 1, greatest(p_tokens, 0))
  on conflict (day) do update set
    calls = u.calls + 1,
    tokens = u.tokens + greatest(p_tokens, 0)
  returning u.calls, u.tokens;
end;
$$;

-- ─── Indexes ──────────────────────────────────────────────
create index if not exists idx_listings_status on listings(status);
create index if not exists idx_listings_seller on listings(seller_agent_id);
create index if not exists idx_negotiations_status on negotiations(status);
create index if not exists idx_agents_owner on agents(owner_id);
create index if not exists idx_agents_status on agents(status);
create index if not exists idx_decisions_agent on agent_decisions(agent_id);
create index if not exists idx_decisions_created on agent_decisions(created_at);
create index if not exists idx_notifications_owner on notifications(owner_id, created_at desc);
create index if not exists idx_negotiations_updated on negotiations(updated_at);

-- ─── Atomic settlement ────────────────────────────────────
-- Closes an accepted negotiation in one transaction: locks the negotiation,
-- listing and buyer rows, checks stock + budget, then writes the order,
-- debits the buyer and decrements stock. Concurrent accepts on the same
-- listing or by the same buyer serialize here instead of overselling or
-- overspending. Raises on any failed check (nothing is written).
create or replace function settle_negotiation(
  p_negotiation_id uuid,
  p_price numeric,
  p_messages jsonb
) returns uuid
language plpgsql
as $$
declare
  v_neg negotiations%rowtype;
  v_listing listings%rowtype;
  v_buyer agents%rowtype;
  v_order_id uuid;
begin
  if p_price is null or p_price <= 0 then
    raise exception 'Invalid settlement price';
  end if;

  select * into v_neg from negotiations where id = p_negotiation_id for update;
  if not found then
    raise exception 'Negotiation not found';
  end if;
  if v_neg.status not in ('open', 'countered', 'awaiting_approval') then
    raise exception 'Negotiation is already closed';
  end if;

  select * into v_listing from listings where id = v_neg.listing_id for update;
  if not found or v_listing.status <> 'active' or coalesce(v_listing.stock, 0) < 1 then
    raise exception 'Listing is sold out';
  end if;

  select * into v_buyer from agents where id = v_neg.buyer_agent_id for update;
  if coalesce(v_buyer.spent, 0) + p_price > coalesce(v_buyer.budget, 0) then
    raise exception 'Buyer budget exceeded';
  end if;

  insert into orders (negotiation_id, buyer_agent_id, seller_agent_id, listing_id, final_price, status)
  values (v_neg.id, v_neg.buyer_agent_id, v_neg.seller_agent_id, v_neg.listing_id, p_price, 'pending')
  returning id into v_order_id;

  update agents set spent = coalesce(spent, 0) + p_price where id = v_buyer.id;

  update listings
     set stock = stock - 1,
         status = case when stock - 1 <= 0 then 'sold' else 'active' end
   where id = v_listing.id;

  update negotiations
     set status = 'accepted',
         current_offer = p_price,
         messages = p_messages,
         updated_at = now()
   where id = v_neg.id;

  return v_order_id;
end;
$$;

-- ─── Row level security ───────────────────────────────────
-- Every write goes through the API with the service role (which bypasses
-- RLS). The public anon key, which ships to every browser, can only READ
-- the marketplace (needed for live updates) and can never write. Private
-- tables (notifications, rate limits, LLM usage) have no anon access at all.
alter table agents enable row level security;
alter table listings enable row level security;
alter table negotiations enable row level security;
alter table orders enable row level security;
alter table agent_decisions enable row level security;
alter table notifications enable row level security;
alter table rate_limits enable row level security;
alter table llm_usage enable row level security;

drop policy if exists "Public read" on agents;
create policy "Public read" on agents for select using (true);
drop policy if exists "Public read" on listings;
create policy "Public read" on listings for select using (true);
drop policy if exists "Public read" on negotiations;
create policy "Public read" on negotiations for select using (true);
drop policy if exists "Public read" on orders;
create policy "Public read" on orders for select using (true);
drop policy if exists "Public read" on agent_decisions;
create policy "Public read" on agent_decisions for select using (true);

-- The SQL functions run with the caller's rights; only the service role
-- (the API) may call them.
revoke execute on function settle_negotiation(uuid, numeric, jsonb) from public, anon, authenticated;
revoke execute on function hit_rate_limit(text, integer) from public, anon, authenticated;
revoke execute on function bump_llm_usage(integer) from public, anon, authenticated;
grant execute on function settle_negotiation(uuid, numeric, jsonb) to service_role;
grant execute on function hit_rate_limit(text, integer) to service_role;
grant execute on function bump_llm_usage(integer) to service_role;
