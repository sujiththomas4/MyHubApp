-- =====================================================================
-- Wealth Hub — Supabase schema
-- Run this in Supabase → SQL Editor (one time).
-- Column names are snake_case; map to camelCase in the app when needed.
-- =====================================================================

-- ---- Settings (fx rate, etc.) ---------------------------------------
create table if not exists app_settings (
  key text primary key,
  value jsonb not null
);

-- ---- Brokers (shared capital) ---------------------------------------
create table if not exists brokers (
  slug text primary key,
  name text not null,
  icon text,
  currency text not null default 'INR',
  capital numeric not null default 0
);

-- ---- Loans + installments -------------------------------------------
create table if not exists loans (
  id text primary key,
  bank_name text not null,
  amount numeric not null,
  currency text not null default 'INR',
  start_date date not null,
  end_date date not null,
  emi numeric not null,
  outstanding_amount numeric not null default 0,
  location text
);

create table if not exists installments (
  id text primary key,
  loan_id text not null references loans(id) on delete cascade,
  number int not null,
  date date not null,
  amount numeric not null,
  status text not null default 'paid'
);

create table if not exists loan_prepayments (
  id text primary key,
  loan_id text not null references loans(id) on delete cascade,
  date date not null,
  amount numeric not null,
  note text
);

-- ---- Savings --------------------------------------------------------
create table if not exists savings_categories (
  slug text primary key,
  name text not null,
  icon text,
  currency text not null default 'INR'
);

create table if not exists savings (
  id text primary key,
  category text not null references savings_categories(slug) on delete cascade,
  name text not null,
  currency text not null default 'INR',
  invested numeric not null default 0,
  current_value numeric not null default 0,
  start_date date,
  locked_years int not null default 0,
  note text
);

-- ---- Stock market investments ---------------------------------------
create table if not exists stock_accounts (
  id text primary key,
  slug text not null,
  account_name text not null,   -- StockmarketAccountName
  region text not null,         -- India | UAE
  currency text not null default 'INR',
  icon text
);

create table if not exists stock_holdings (
  id text primary key,
  account_id text not null references stock_accounts(id) on delete cascade,
  name text not null,
  qty numeric not null default 0,
  invested numeric not null default 0,
  current_value numeric not null default 0,
  note text
);

-- ---- Business: broker accounts + day P&L (Option Buying/Selling/Intraday)
create table if not exists broker_accounts (
  id text primary key,
  module text not null,         -- option-buying | option-selling | intraday-stocks
  slug text not null,           -- broker slug (references brokers.slug logically)
  broker text not null,
  icon text,
  currency text not null default 'INR'
);

create table if not exists broker_trades (
  id text primary key,
  account_id text not null references broker_accounts(id) on delete cascade,
  date date not null,
  orders int not null default 0,
  gross_pnl numeric not null default 0,
  brokerage numeric not null default 0,
  govt_charges numeric not null default 0
);

-- ---- Plantation -----------------------------------------------------
create table if not exists plantation_entries (
  id text primary key,
  type text not null,           -- income | expense
  date date not null,
  due_date date,
  category text,
  amount numeric not null default 0,
  status text not null default 'settled',
  note text
);

create table if not exists plantation_activities (
  id text primary key,
  date date not null,
  due_date date,
  activity text not null,
  status text not null default 'planned',
  note text
);

-- ---- Trading journal ------------------------------------------------
create table if not exists journal_days (
  date date primary key,
  note text,
  premarket jsonb not null default '{}'::jsonb
);

create table if not exists journal_trades (
  id text primary key,
  day date not null references journal_days(date) on delete cascade,
  time text,
  instrument text,
  side text,
  qty numeric,
  entry numeric,
  exit numeric,
  pnl numeric,
  answers jsonb not null default '{}'::jsonb
);

create table if not exists journal_notes (
  id text primary key,
  day date not null references journal_days(date) on delete cascade,
  time text,
  text text,                    -- rich-text HTML "my observation or plans"
  image text,                   -- legacy single attachment (storage URL)
  screenshots jsonb not null default '{}'::jsonb,  -- named shots -> storage URL
  answers jsonb not null default '{}'::jsonb
);

-- `create table if not exists` above is a no-op on an existing database, so add
-- the column explicitly for projects created before observations gained their
-- named screenshots (Nifty 50, Nifty Future, OI change, VIX, plan).
alter table journal_notes
  add column if not exists screenshots jsonb not null default '{}'::jsonb;

-- ---- Chart patterns -------------------------------------------------
create table if not exists chart_patterns (
  id text primary key,
  title text not null,
  timeframe text not null,      -- 3m | 5m
  image_url text,               -- storage URL
  conditions jsonb not null default '[]'::jsonb,
  notes text,
  featured boolean not null default false  -- surfaced on "Before I Trade"
);

-- `create table if not exists` is a no-op on an existing database, so add the
-- column explicitly for projects created before patterns could be featured.
alter table chart_patterns
  add column if not exists featured boolean not null default false;

-- ---- Daily trade review ---------------------------------------------
-- One row per trading day: which of the defined mistakes were actually
-- committed. `mistakes` holds the mistake ids from dailyReview.js, so adding or
-- renaming a mistake needs no migration.
create table if not exists daily_reviews (
  date date primary key,
  mistakes jsonb not null default '[]'::jsonb,
  note text,
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security. Personal app → require an authenticated user.
-- (Enable an auth provider in Supabase → Authentication, e.g. Email.)
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'app_settings','brokers','loans','installments','loan_prepayments',
    'savings_categories','savings','stock_accounts','stock_holdings',
    'broker_accounts','broker_trades','plantation_entries','plantation_activities',
    'journal_days','journal_trades','journal_notes','chart_patterns','daily_reviews'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format($p$create policy "authed all" on %I for all to authenticated using (true) with check (true);$p$, t);
  end loop;
end $$;

-- =====================================================================
-- Realtime: broadcast changes for every table.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'app_settings','brokers','loans','installments','loan_prepayments',
    'savings_categories','savings','stock_accounts','stock_holdings',
    'broker_accounts','broker_trades','plantation_entries','plantation_activities',
    'journal_days','journal_trades','journal_notes','chart_patterns','daily_reviews'
  ] loop
    execute format('alter publication supabase_realtime add table %I;', t);
  end loop;
end $$;

-- =====================================================================
-- Storage bucket for images + policies (run after creating the bucket in
-- Storage, or this creates it). Authenticated users read/write.
-- =====================================================================
insert into storage.buckets (id, name, public) values ('images', 'images', true)
on conflict (id) do nothing;

create policy "images read"  on storage.objects for select using (bucket_id = 'images');
create policy "images write" on storage.objects for insert to authenticated with check (bucket_id = 'images');
create policy "images update" on storage.objects for update to authenticated using (bucket_id = 'images');
create policy "images delete" on storage.objects for delete to authenticated using (bucket_id = 'images');
