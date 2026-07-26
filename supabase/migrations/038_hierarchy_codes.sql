-- Plantation — a short reference code per hierarchy level. The full reference
-- is composed down the tree, e.g. CHRY-ZA-R1-P1-BP1 (property-zone-row-pole-plant).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_lands     add column if not exists code text;
alter table plantation_zones     add column if not exists code text;
alter table plantation_verticals add column if not exists code text;
alter table plantation_poles     add column if not exists code text;
alter table plantation_plants    add column if not exists code text;

notify pgrst, 'reload schema';
