-- Plantation — tag activities and defects with a property (land_id).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_activities add column if not exists land_id text;
alter table plantation_defects    add column if not exists land_id text;

notify pgrst, 'reload schema';
