-- Plantation activities can be flagged as high importance (pinned to the top).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_activities
  add column if not exists important boolean not null default false;

notify pgrst, 'reload schema';
