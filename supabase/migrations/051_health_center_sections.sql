-- Plantation — turn the fertilizer library into a tabbed "Health Center": one
-- table, many sections (Soil, Pepper Plant, …). Each entry belongs to a section
-- (tab). Sections are also seeded as a Master Data list so tabs can be managed.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_fertilizers add column if not exists section text;

-- Default existing rows to the Soil section so nothing gets orphaned.
update plantation_fertilizers set section = 'Soil' where section is null or section = '';

insert into lookups (id, list, value, sort_order) values
  ('lk-hc-1', 'Health Center Section', 'Soil', 1),
  ('lk-hc-2', 'Health Center Section', 'Pepper Plant', 2)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
