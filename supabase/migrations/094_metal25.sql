-- Metal 25 — ETF holdings (GOLDBEES / SILVERBEES). Uses the shared
-- ee_stock_allotments / ee_stock_allotment_lines (plan_code='METAL25') and
-- ee_plan_state('METAL25') from migrations 091 & 093. (Postgres adaptation.)
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists ee_etf_holdings (
  id             text primary key,
  symbol         text not null,
  name           text not null,
  target_weight  numeric not null,             -- fraction
  ltp            numeric not null default 0,
  qty            numeric not null default 0,
  invested       numeric not null default 0,
  ltp_updated_at timestamptz,
  display_order  int not null
);
insert into ee_etf_holdings (id, symbol, name, target_weight, display_order) values
  ('GOLDBEES',   'GOLDBEES',   'Nippon Gold ETF',   0.70, 1),
  ('SILVERBEES', 'SILVERBEES', 'Nippon Silver ETF', 0.30, 2)
on conflict (id) do nothing;

do $$
begin
  execute 'alter table ee_etf_holdings enable row level security';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_etf_holdings' and policyname='authed all') then create policy "authed all" on ee_etf_holdings for all to authenticated using (true) with check (true); end if;
  begin alter publication supabase_realtime add table ee_etf_holdings; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
