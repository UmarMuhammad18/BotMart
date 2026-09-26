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
