-- Comments / updates on a plants-booked row. Each comment records who added it
-- and when, plus any @-mentioned users.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists pepper_booking_comments (
  id text primary key,
  booking_id text not null,
  body text not null,
  author_id text,
  author_name text,
  mentions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table pepper_booking_comments enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'pepper_booking_comments' and policyname = 'authed all'
  ) then
    create policy "authed all" on pepper_booking_comments for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table pepper_booking_comments;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
