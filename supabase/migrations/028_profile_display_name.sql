-- Profiles — a friendly display name used in people-picker dropdowns.
--
-- Falls back to full_name, then email, when blank.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table profiles add column if not exists display_name text;

notify pgrst, 'reload schema';
