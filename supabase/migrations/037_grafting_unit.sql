-- Plant Factory — add "Grafting Unit" to the Propagation Type list.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

insert into lookups (id, list, value, sort_order) values
  ('lk-prop-7', 'Propagation Type', 'Grafting Unit', 7)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
