-- Pepper bookings — growth form (Climber / Bush).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_pepper_bookings
  add column if not exists growth_form text;   -- 'Climber' | 'Bush'

notify pgrst, 'reload schema';
