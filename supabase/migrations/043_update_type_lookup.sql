-- Seed the "Update Type" master-data list that feeds the plantation timeline's
-- type dropdown. The values regular/defect/dead/recovered are canonical keys the
-- app keys behaviour off (defect thread, plant status sync) — renaming them drops
-- that behaviour, but you can freely ADD your own observation types here.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

insert into lookups (id, list, value, sort_order) values
  ('lk-ut-1', 'Update Type', 'regular', 1),
  ('lk-ut-2', 'Update Type', 'defect', 2),
  ('lk-ut-3', 'Update Type', 'dead', 3),
  ('lk-ut-4', 'Update Type', 'recovered', 4)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
