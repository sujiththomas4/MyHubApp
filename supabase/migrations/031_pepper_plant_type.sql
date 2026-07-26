-- Pepper bookings — plant type (Grafted / Normal). These are plants ordered for
-- our own plantation, so money fields (rate/advance) are no longer used in the
-- UI; the columns are left in place but ignored.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_pepper_bookings
  add column if not exists plant_type text;   -- 'Grafted' | 'Normal'

notify pgrst, 'reload schema';
