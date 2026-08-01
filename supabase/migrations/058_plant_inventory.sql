-- Plantation — link plants to the booking "inventory": record the crop and type
-- (grafted/normal) on each plant so the add-plant flow can validate against the
-- pepper-booking inventory (planned can draw on any booking; planted only on
-- delivered stock).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_plants add column if not exists crop text;
alter table plantation_plants add column if not exists plant_type text;

notify pgrst, 'reload schema';
