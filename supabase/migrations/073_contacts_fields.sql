-- Contacts get a category + district + "specialised in" so the directory can
-- hold nurseries, brokers, suppliers, officers… with richer detail.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_contacts
  add column if not exists category text,
  add column if not exists district text,
  add column if not exists specialised_in text;

notify pgrst, 'reload schema';
