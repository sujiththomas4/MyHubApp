-- Plantation — a reference link can point to one of the crop's contacts (the
-- person to reach out to about that reference).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_crop_links add column if not exists contact_id text;

notify pgrst, 'reload schema';
