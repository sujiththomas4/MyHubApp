-- Stock Swing Trading: positions + their trades (buys / sells). A position holds
-- a stock; trades are buys (incl. limit orders not yet filled) and sells (square
-- off, partial or full). Realised / unrealised P&L is computed from the trades +
-- the position's current price.
--
--   swing_trades.kind       : 'buy' | 'sell'
--   swing_trades.order_type : 'market' | 'limit'   (limit + pending = not yet bought)
--   swing_trades.status     : 'executed' | 'pending'
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists swing_positions (
  id text primary key,
  symbol text not null,
  name text,
  current_price numeric,
  note text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists swing_trades (
  id text primary key,
  position_id text not null,
  kind text not null default 'buy',
  qty numeric,
  price numeric,
  order_type text default 'market',
  status text not null default 'executed',
  date date,
  note text,
  created_at timestamptz not null default now()
);

do $$
begin
  perform 1;
  execute 'alter table swing_positions enable row level security';
  execute 'alter table swing_trades enable row level security';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='swing_positions' and policyname='authed all') then
    create policy "authed all" on swing_positions for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='swing_trades' and policyname='authed all') then
    create policy "authed all" on swing_trades for all to authenticated using (true) with check (true);
  end if;
  begin alter publication supabase_realtime add table swing_positions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table swing_trades; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
