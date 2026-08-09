-- Site-wide activity log. Every meaningful action (booking added, supervisor
-- update, activity created…) writes one simple row: an auto-generated work
-- description + some metadata + who did it. The Road Map screen reads this back
-- as a timeline so you can see what happened, and when.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists activity_log (
  id text primary key,
  category text not null default 'other',
  description text not null,
  meta jsonb not null default '{}'::jsonb,
  actor_id text,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_idx on activity_log (created_at);

alter table activity_log enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'activity_log' and policyname = 'authed all'
  ) then
    create policy "authed all" on activity_log for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table activity_log;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
