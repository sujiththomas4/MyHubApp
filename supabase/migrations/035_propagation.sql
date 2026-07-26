-- Plantation — in-house propagation / nursery activities.
--
-- Each row is a propagation batch of a given type (Thippali Nursery, Layering
-- Unit, Pepper Climber, Bush Pepper, Grafted Pepper Climber, Grafted Bush
-- Pepper…). quantity = plants started; ready_qty = successfully rooted/ready.
-- Types come from the "Propagation Type" master-data list.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_propagation (
  id text primary key,
  type text,
  label text,                 -- batch name / code
  location text,              -- zone / area
  start_date date,
  expected_date date,         -- expected ready date
  quantity numeric not null default 0,   -- started
  ready_qty numeric not null default 0,  -- rooted / ready
  status text not null default 'in_progress',  -- in_progress | ready | planted | failed
  assigned text,
  note text,
  image text,
  created_at timestamptz not null default now()
);

alter table plantation_propagation enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='plantation_propagation' and policyname='authed all') then
    create policy "authed all" on plantation_propagation for all to authenticated using (true) with check (true);
  end if;
  begin alter publication supabase_realtime add table plantation_propagation; exception when duplicate_object then null; end;
end $$;

-- Seed the propagation types.
insert into lookups (id, list, value, sort_order) values
  ('lk-prop-1', 'Propagation Type', 'Thippali Nursery', 1),
  ('lk-prop-2', 'Propagation Type', 'Layering Unit', 2),
  ('lk-prop-3', 'Propagation Type', 'Pepper Climber', 3),
  ('lk-prop-4', 'Propagation Type', 'Bush Pepper', 4),
  ('lk-prop-5', 'Propagation Type', 'Grafted Pepper Climber', 5),
  ('lk-prop-6', 'Propagation Type', 'Grafted Bush Pepper', 6)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
