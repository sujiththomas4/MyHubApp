-- Plant bookings — a `crop` so the same screen serves Pepper, Payyani,
-- Thippali, etc. Existing rows default to 'Pepper'. Crop buttons come from the
-- "Crop" master-data list.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_pepper_bookings
  add column if not exists crop text not null default 'Pepper';

insert into lookups (id, list, value, sort_order) values
  ('lk-crop-1', 'Crop', 'Pepper', 1),
  ('lk-crop-2', 'Crop', 'Payyani', 2),
  ('lk-crop-3', 'Crop', 'Thippali', 3)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
