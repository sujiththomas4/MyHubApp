-- Comments on plantation activities. Anyone can add a comment (with @mentions);
-- records who added it and when.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists activity_comments (
  id text primary key,
  activity_id text not null,
  body text not null,
  author_id text,
  author_name text,
  mentions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table activity_comments enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'activity_comments' and policyname = 'authed all'
  ) then
    create policy "authed all" on activity_comments for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table activity_comments;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
