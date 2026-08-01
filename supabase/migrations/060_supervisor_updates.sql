-- Plantation — bi-weekly supervisor updates. A periodic report from the site
-- supervisor: work done, highlights, concerns and the next plan, per property.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_supervisor_updates (
  id text primary key,
  land_id text,
  date date,
  period_from date,
  period_to date,
  supervisor text,
  title text not null,
  work_done text,
  highlights text,
  concerns text,
  next_plan text,
  image text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_sup_updates_land on plantation_supervisor_updates (land_id);

alter table plantation_supervisor_updates enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'plantation_supervisor_updates' and policyname = 'authed all'
  ) then
    create policy "authed all" on plantation_supervisor_updates for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table plantation_supervisor_updates;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
