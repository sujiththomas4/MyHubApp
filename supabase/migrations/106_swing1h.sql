-- Swing 1 Hour — a discretionary 1-hour-chart trading screen, plus the shared
-- stock universe it picks from.
--
-- Stock Strength becomes the master universe: it gains the A/B/C/H bucket and
-- the thesis text, and is seeded with a COPY of the Swing 50 watchlist. From
-- here the two lists are independent — stocks added to Stock Strength do not
-- appear in Swing 50, which keeps its own tighter 23-name list.
--
-- Swing 1 Hour is deliberately ungated: no entry checklist, no stop rules, no
-- portfolio caps. ATR(14) on the 1-hour chart is recorded so the screen can
-- show, after the fact, which stop distances actually worked.
--
-- Requires 101_swing50_watchlist_expand.sql to have run first (rationale col).
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

-- 1. Stock Strength gains the categories -------------------------------------
alter table stock_strength add column if not exists bucket    text;
alter table stock_strength add column if not exists rationale text;

-- 2. Seed it with a copy of the Swing 50 watchlist ---------------------------
-- Matched on symbol so re-running never duplicates, and never overwrites a
-- stock you have already edited here.
insert into stock_strength (id, symbol, name, sector, bucket, rationale, sort_order, updated_at)
select 'ss-' || lower(w.ticker), w.ticker, w.name, w.sector, w.bucket, w.rationale,
       row_number() over (order by w.bucket, w.ticker), now()
from swing50_watchlist w
where not exists (
  select 1 from stock_strength s where upper(trim(s.symbol)) = upper(trim(w.ticker))
);

-- 3. The 1-hour trade book ---------------------------------------------------
create table if not exists swing1h_trades (
  id           text primary key,
  symbol       text not null,
  bucket       text,
  sector       text,
  state        text not null default 'OPEN',    -- OPEN | CLOSED
  entry        numeric not null,
  stop_price   numeric not null,
  target_price numeric,
  atr          numeric,                          -- ATR(14) on the 1-hour chart
  qty          int not null default 0,
  ltp          numeric,
  entry_at     timestamptz,
  exit_price   numeric,
  exit_at      timestamptz,
  exit_reason  text,                             -- TARGET|STOP|TRAIL|TIME|MANUAL
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists swing1h_trades_state_idx on swing1h_trades (state);

alter table swing1h_trades enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='swing1h_trades' and policyname='authed all') then
    create policy "authed all" on swing1h_trades for all to authenticated using (true) with check (true);
  end if;
  begin alter publication supabase_realtime add table swing1h_trades; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
