-- Activities can now be assigned to MULTIPLE users. Store the assignees as a
-- JSONB array of profile ids in assigned_ids; backfill from the old single
-- assigned_to column. The old column is left in place but unused.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_activities
  add column if not exists assigned_ids jsonb not null default '[]'::jsonb;

update plantation_activities
   set assigned_ids = to_jsonb(array[assigned_to])
 where assigned_to is not null
   and assigned_to <> ''
   and assigned_ids = '[]'::jsonb;

notify pgrst, 'reload schema';
