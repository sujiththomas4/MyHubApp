-- Plantation — give each zone a position on a simple grid so the Explorer "Plot"
-- view can draw the property to scale/shape (e.g. Zone E on the left spanning two
-- rows, Zones A–D stacked on the right).
--
--   layout_x = column start (1-based)   layout_w = column span
--   layout_y = row start (1-based)      layout_h = row span
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_zones add column if not exists layout_x int;
alter table plantation_zones add column if not exists layout_y int;
alter table plantation_zones add column if not exists layout_w int;
alter table plantation_zones add column if not exists layout_h int;

notify pgrst, 'reload schema';
