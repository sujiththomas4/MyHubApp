-- Plantation — tag bookings, propagation, capital and expenses with a property
-- (land_id references plantation_lands.id).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_pepper_bookings add column if not exists land_id text;
alter table plantation_propagation     add column if not exists land_id text;
alter table plantation_capital         add column if not exists land_id text;
alter table plantation_expenses        add column if not exists land_id text;

notify pgrst, 'reload schema';
