-- Swing 50 — a rules-driven swing-trading discipline machine (replaces the
-- old simple "Stock Swing Trading" screen in place). New swing50_* tables so
-- the legacy swing_positions/swing_trades data is left untouched.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists swing50_config (
  id                 text primary key default 'main',
  total_capital      numeric not null default 1000000,
  deploy_cap_pct     numeric not null default 0.50,
  risk_per_trade_pct numeric not null default 0.01,
  max_positions      int not null default 8,
  max_position_value numeric not null default 80000,
  max_per_sector     int not null default 2,
  dd_caution_pct     numeric not null default 0.06,
  dd_halt_pct        numeric not null default 0.08,
  halt_days          int not null default 7,
  gold_sleeve_pct    numeric not null default 0.10,
  status             text not null default 'ACTIVE',   -- ACTIVE | CAUTION | HALTED
  halted_until       date,
  peak_equity        numeric not null default 0
);
insert into swing50_config (id) values ('main') on conflict (id) do nothing;

create table if not exists swing50_buckets (
  code    text primary key,   -- A | B | C | H
  name    text not null,
  max_pct numeric not null,
  display_order int not null default 0
);
insert into swing50_buckets (code, name, max_pct, display_order) values
  ('A', 'Escalation beneficiaries',    0.30, 1),
  ('B', 'Oil-neutral / rupee winners', 0.50, 2),
  ('C', 'De-escalation plays',         0.30, 3),
  ('H', 'Gold hedge sleeve',           0.12, 4)
on conflict (code) do nothing;

create table if not exists swing50_watchlist (
  id      text primary key,
  ticker  text not null,
  name    text not null,
  bucket  text not null,
  sector  text not null,
  active  boolean not null default true
);
insert into swing50_watchlist (id, ticker, name, bucket, sector) values
  ('wl-ongc', 'ONGC', 'Oil & Natural Gas Corp', 'A', 'Upstream oil'),
  ('wl-oil', 'OIL', 'Oil India', 'A', 'Upstream oil'),
  ('wl-hal', 'HAL', 'Hindustan Aeronautics', 'A', 'Defence'),
  ('wl-bel', 'BEL', 'Bharat Electronics', 'A', 'Defence'),
  ('wl-hindalco', 'HINDALCO', 'Hindalco Industries', 'A', 'Metals'),
  ('wl-infy', 'INFY', 'Infosys', 'B', 'IT'),
  ('wl-hcltech', 'HCLTECH', 'HCL Technologies', 'B', 'IT'),
  ('wl-sunpharma', 'SUNPHARMA', 'Sun Pharma', 'B', 'Pharma'),
  ('wl-cipla', 'CIPLA', 'Cipla', 'B', 'Pharma'),
  ('wl-hindunilvr', 'HINDUNILVR', 'Hindustan Unilever', 'B', 'FMCG'),
  ('wl-muthootfin', 'MUTHOOTFIN', 'Muthoot Finance', 'B', 'Gold NBFC'),
  ('wl-indigo', 'INDIGO', 'InterGlobe Aviation', 'C', 'Aviation'),
  ('wl-maruti', 'MARUTI', 'Maruti Suzuki', 'C', 'Auto'),
  ('wl-asianpaint', 'ASIANPAINT', 'Asian Paints', 'C', 'Paints'),
  ('wl-bpcl', 'BPCL', 'Bharat Petroleum', 'C', 'OMC'),
  ('wl-goldbees', 'GOLDBEES', 'Nippon Gold BeES', 'H', 'Hedge')
on conflict (id) do nothing;

create table if not exists swing50_trades (
  id           text primary key,
  ticker       text not null,
  bucket       text not null,
  sector       text not null,
  state        text not null default 'PLANNED',   -- PLANNED | OPEN | CLOSED | CANCELLED
  plan_entry   numeric not null,
  stop_price   numeric not null,
  target_price numeric not null,
  setup_reason text not null,
  qty          int not null,
  ltp          numeric,                            -- current price (open positions)
  actual_entry numeric,
  entry_date   date,
  exit_price   numeric,
  exit_date    date,
  exit_reason  text,                               -- TARGET|STOP|TRAIL|TIME|EVENT|CIRCUIT
  lesson       text,
  created_at   timestamptz not null default now()
);

create table if not exists swing50_halt_log (
  id             text primary key,
  halted_on      date not null,
  drawdown_pct   numeric not null,
  review_note    text,
  reactivated_on date
);

create table if not exists swing50_events (
  id         text primary key,
  event_date date not null,
  title      text not null,
  note       text
);

do $$
declare t text;
begin
  foreach t in array array['swing50_config','swing50_buckets','swing50_watchlist','swing50_trades','swing50_halt_log','swing50_events'] loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='authed all') then
      execute format('create policy "authed all" on %I for all to authenticated using (true) with check (true)', t);
    end if;
    begin execute format('alter publication supabase_realtime add table %I', t); exception when duplicate_object then null; end;
  end loop;
end $$;

notify pgrst, 'reload schema';
