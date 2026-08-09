-- Planned crops get reference columns used in the Plant Factory "Plants" tab:
-- specification, expected yield (value + unit), and interested vs planted counts.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_planned_crops
  add column if not exists specification text,
  add column if not exists yield_value numeric,
  add column if not exists yield_unit text default 'months',
  add column if not exists interested numeric,
  add column if not exists planted numeric;

notify pgrst, 'reload schema';
