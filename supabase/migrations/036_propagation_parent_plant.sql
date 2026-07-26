-- Propagation — link a batch to the parent plant it was created from.
--
-- parent_plant_id references plantation_plants.id; quantity is the number of
-- child plants created from that parent.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_propagation
  add column if not exists parent_plant_id text;

notify pgrst, 'reload schema';
