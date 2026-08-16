-- Eva & Ezaak strategy system — registry + shared market-holiday calendar +
-- shared plan_state (cash carryover / top_n per plan). Adapted from the MySQL
-- specs to Postgres/Supabase.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists ee_strategies (
  code           text primary key,
  name           text not null,
  screen_route   text not null,
  vehicle        text not null,               -- mutual_fund | stock | etf
  default_amount numeric not null,
  display_order  int not null,
  active         boolean not null default true
);
insert into ee_strategies (code, name, screen_route, vehicle, default_amount, display_order) values
  ('STEADY25', 'Steady 25 SIP',   '/wealth/eva-ezaak/steady-25', 'mutual_fund', 50000, 1),
  ('FOCUS25',  'Focus 25 Stocks', '/wealth/eva-ezaak/focus-25',  'stock',       25000, 2),
  ('METAL25',  'Metal 25',        '/wealth/eva-ezaak/metal-25',  'etf',          5000, 3)
on conflict (code) do nothing;

create table if not exists market_holidays (
  holiday_date date primary key,
  description  text
);
-- Fixed-date national holidays NSE observes (weekends are handled in code).
-- Maintain / extend from the NSE holiday calendar each year.
insert into market_holidays (holiday_date, description) values
  ('2026-01-26', 'Republic Day'),
  ('2026-08-15', 'Independence Day'),
  ('2026-10-02', 'Gandhi Jayanti'),
  ('2026-12-25', 'Christmas')
on conflict (holiday_date) do nothing;

create table if not exists ee_plan_state (
  plan_code    text primary key,
  cash_balance numeric not null default 0,
  top_n        int not null default 3
);
insert into ee_plan_state (plan_code, cash_balance, top_n) values
  ('FOCUS25', 0, 3),
  ('METAL25', 0, 2)
on conflict (plan_code) do nothing;

do $$
begin
  execute 'alter table ee_strategies enable row level security';
  execute 'alter table market_holidays enable row level security';
  execute 'alter table ee_plan_state enable row level security';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_strategies' and policyname='authed all') then create policy "authed all" on ee_strategies for all to authenticated using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='market_holidays' and policyname='authed all') then create policy "authed all" on market_holidays for all to authenticated using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_plan_state' and policyname='authed all') then create policy "authed all" on ee_plan_state for all to authenticated using (true) with check (true); end if;
  begin alter publication supabase_realtime add table ee_strategies; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table market_holidays; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table ee_plan_state; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
