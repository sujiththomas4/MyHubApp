-- Plantation — simplify planned-crop references to a single section. The contacts
-- table now holds everything: name, phone, address and an optional YouTube link.
-- (The separate plantation_crop_links table is no longer used by the app.)
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_crop_contacts add column if not exists address text;
alter table plantation_crop_contacts add column if not exists youtube text;

notify pgrst, 'reload schema';
