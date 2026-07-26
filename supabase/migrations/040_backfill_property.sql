-- Backfill for a single property: give the land the reference code CHRY, then
-- tag every existing plantation record (bookings, propagation, capital,
-- expenses) with that property.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

-- Reference code column on lands (added in 038; repeated here so this is standalone).
alter table plantation_lands add column if not exists code text;

-- Set the property's reference code (only if it isn't set yet).
update plantation_lands set code = 'CHRY' where code is null or code = '';

-- Tag all existing rows with the CHRY property's id.
update plantation_pepper_bookings set land_id = (select id from plantation_lands where code = 'CHRY' limit 1) where land_id is null or land_id = '';
update plantation_propagation     set land_id = (select id from plantation_lands where code = 'CHRY' limit 1) where land_id is null or land_id = '';
update plantation_capital         set land_id = (select id from plantation_lands where code = 'CHRY' limit 1) where land_id is null or land_id = '';
update plantation_expenses        set land_id = (select id from plantation_lands where code = 'CHRY' limit 1) where land_id is null or land_id = '';

notify pgrst, 'reload schema';
