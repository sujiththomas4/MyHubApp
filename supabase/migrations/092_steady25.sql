-- Steady 25 SIP — 4 fixed funds + monthly allotments. (Postgres adaptation.)
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists ee_funds (
  id                text primary key,          -- = code
  code              text not null unique,
  name              text not null,
  target_weight     numeric not null,          -- fraction, e.g. 0.5000
  invested          numeric not null default 0,
  current_value     numeric not null default 0,
  values_updated_at timestamptz,
  display_order     int not null
);
insert into ee_funds (id, code, name, target_weight, display_order) values
  ('NIFTY50', 'NIFTY50', 'Nifty 50 Index Fund',      0.50, 1),
  ('NEXT50',  'NEXT50',  'Nifty Next 50 Index Fund', 0.20, 2),
  ('GOLD',    'GOLD',    'Gold Fund',                0.15, 3),
  ('DEBT',    'DEBT',    'Debt Fund',                0.15, 4)
on conflict (id) do nothing;

create table if not exists ee_fund_allotments (
  id              text primary key,
  allotment_month text not null unique,        -- 'YYYY-MM'
  invest_date     date not null,
  total_amount    numeric not null,
  created_at      timestamptz not null default now()
);

create table if not exists ee_fund_allotment_lines (
  id           text primary key,
  allotment_id text not null,
  fund_id      text not null,
  amount       numeric not null                -- 0 allowed (skipped fund)
);

do $$
begin
  execute 'alter table ee_funds enable row level security';
  execute 'alter table ee_fund_allotments enable row level security';
  execute 'alter table ee_fund_allotment_lines enable row level security';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_funds' and policyname='authed all') then create policy "authed all" on ee_funds for all to authenticated using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_fund_allotments' and policyname='authed all') then create policy "authed all" on ee_fund_allotments for all to authenticated using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_fund_allotment_lines' and policyname='authed all') then create policy "authed all" on ee_fund_allotment_lines for all to authenticated using (true) with check (true); end if;
  begin alter publication supabase_realtime add table ee_funds; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table ee_fund_allotments; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table ee_fund_allotment_lines; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
