-- Income planner — projected income sources with an expected return and a
-- cadence (daily / monthly / yearly). The screen normalises everything to show
-- how much can be earned per day / month / year.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists income_plans (
  id text primary key,
  type text not null,                       -- free-text income type
  amount numeric,                           -- expected return per period
  frequency text not null default 'monthly',-- daily | monthly | yearly
  note text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table income_plans enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'income_plans' and policyname = 'authed all'
  ) then
    create policy "authed all" on income_plans for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table income_plans;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
