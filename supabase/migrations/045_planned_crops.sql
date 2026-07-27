-- Plantation — planned crops register. A planning list of crops to grow
-- (Black Pepper climber, Bush pepper, Coffee, Cardamom…) with status, suggested
-- planting window, time-to-result, and reference material (YouTube links + contacts).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_planned_crops (
  id text primary key,
  name text not null,
  status text not null default 'not_started',   -- not_started | started
  plant_from text,                               -- suggested planting window: month (Jan..Dec)
  plant_to text,
  duration text,                                 -- time to get a result, e.g. "3 years"
  youtube text,                                  -- reference links, one URL per line
  contacts text,                                 -- points of contact, one per line
  note text,
  image text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table plantation_planned_crops enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'plantation_planned_crops' and policyname = 'authed all'
  ) then
    create policy "authed all" on plantation_planned_crops for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table plantation_planned_crops;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
