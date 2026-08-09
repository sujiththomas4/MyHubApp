-- Plantation activities can be assigned to a user (profiles.id).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_activities
  add column if not exists assigned_to text;

notify pgrst, 'reload schema';
