-- Recurring supervisor-update schedules. We store only the recurrence RULE, not
-- one row per occurrence — occurrences are computed on the fly from start/end +
-- the rule, so editing a rule reshapes all future occurrences without touching
-- saved updates. A saved update links back to its schedule + occurrence date.
--
--   frequency  : 'weekly' | 'monthly'
--   interval   : every N weeks/months
--   weekdays   : [0..6] (Sun..Sat) for weekly rules
--   day_of_month: 1..31 for monthly rules
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_update_schedules (
  id text primary key,
  title text not null,
  land_id text,
  supervisor text,
  start_date date not null,
  end_date date,
  frequency text not null default 'weekly',
  interval int not null default 1,
  weekdays jsonb not null default '[]'::jsonb,
  day_of_month int,
  active boolean not null default true,
  note text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table plantation_update_schedules enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'plantation_update_schedules' and policyname = 'authed all'
  ) then
    create policy "authed all" on plantation_update_schedules for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table plantation_update_schedules;
  exception when duplicate_object then null;
  end;
end $$;

-- Link a saved update back to the schedule occurrence it fulfils.
alter table plantation_supervisor_updates
  add column if not exists schedule_id text,
  add column if not exists occurrence_date date;

notify pgrst, 'reload schema';
