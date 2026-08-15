-- Eva & Ezaak — "Investment in Top 20 Stocks": stock positions across large /
-- mid / small cap, with buy/sell trades. Avg price, quantity, invested, current
-- value and P&L are derived from the trades + the stock's current price.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists ee_stocks (
  id text primary key,
  category text not null default 'large',   -- large | mid | small
  name text,
  symbol text,
  current_price numeric,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists ee_trades (
  id text primary key,
  stock_id text not null,
  kind text not null default 'buy',         -- buy | sell
  qty numeric,
  price numeric,
  date date,
  created_at timestamptz not null default now()
);

do $$
begin
  execute 'alter table ee_stocks enable row level security';
  execute 'alter table ee_trades enable row level security';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_stocks' and policyname='authed all') then
    create policy "authed all" on ee_stocks for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_trades' and policyname='authed all') then
    create policy "authed all" on ee_trades for all to authenticated using (true) with check (true);
  end if;
  begin alter publication supabase_realtime add table ee_stocks; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table ee_trades; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
