-- Focus 25 Stocks — up to 25 stocks, equal target, whole-unit gap-fill top-N.
-- Plan state (cash carryover / top_n) lives in ee_plan_state (mig 091).
-- Quarterly review log. (Postgres adaptation.)
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists ee_focus_stocks (
  id             text primary key,
  symbol         text not null,
  name           text not null,
  tier           text not null default 'large', -- large | mid | small
  sector         text,
  target_weight  numeric not null default 0,    -- fraction of whole portfolio
  ltp            numeric not null default 0,
  qty            numeric not null default 0,   -- shares held
  invested       numeric not null default 0,   -- cost basis
  ltp_updated_at timestamptz,
  checklist      jsonb,
  notes          text,
  active         boolean not null default true,
  display_order  int not null default 0
);

create table if not exists ee_stock_allotments (
  id              text primary key,
  plan_code       text not null,               -- FOCUS25 | METAL25
  allotment_month text not null,               -- 'YYYY-MM'
  invest_date     date not null,
  amount          numeric not null,            -- fresh money this month
  cash_before     numeric not null default 0,
  cash_after      numeric not null default 0,
  created_at      timestamptz not null default now(),
  unique (plan_code, allotment_month)
);

create table if not exists ee_stock_allotment_lines (
  id           text primary key,
  allotment_id text not null,
  stock_id     text not null,                  -- ee_focus_stocks.id or ee_etf_holdings.id
  shares       numeric not null,
  price        numeric not null,               -- ltp at allotment time
  cost         numeric not null
);

create table if not exists ee_review_log (
  id          text primary key,
  plan_code   text not null,
  review_month text not null,                  -- 'YYYY-MM'
  note        text,
  created_at  timestamptz not null default now()
);

do $$
begin
  execute 'alter table ee_focus_stocks enable row level security';
  execute 'alter table ee_stock_allotments enable row level security';
  execute 'alter table ee_stock_allotment_lines enable row level security';
  execute 'alter table ee_review_log enable row level security';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_focus_stocks' and policyname='authed all') then create policy "authed all" on ee_focus_stocks for all to authenticated using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_stock_allotments' and policyname='authed all') then create policy "authed all" on ee_stock_allotments for all to authenticated using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_stock_allotment_lines' and policyname='authed all') then create policy "authed all" on ee_stock_allotment_lines for all to authenticated using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_review_log' and policyname='authed all') then create policy "authed all" on ee_review_log for all to authenticated using (true) with check (true); end if;
  begin alter publication supabase_realtime add table ee_focus_stocks; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table ee_stock_allotments; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table ee_stock_allotment_lines; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table ee_review_log; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
