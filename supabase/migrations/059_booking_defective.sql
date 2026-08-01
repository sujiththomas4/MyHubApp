-- Plantation — track how many booked/delivered plants turned out defective, so
-- the usable inventory (quantity − defective) is what feeds the add-plant flow.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_pepper_bookings add column if not exists defective int not null default 0;

notify pgrst, 'reload schema';
