-- Pepper bookings — delivery charge (added to the total).
--
-- Total = quantity x rate + delivery_charge; balance = total - advance.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_pepper_bookings
  add column if not exists delivery_charge numeric not null default 0;

notify pgrst, 'reload schema';
