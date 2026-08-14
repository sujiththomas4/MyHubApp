-- Keep the planned entry separate from the actual executed entry, so we can flag
-- trades where execution drifted from the plan (premium decay, slippage, etc.).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table challenge_trades
  add column if not exists planned_entry numeric;

-- Backfill: existing rows treat their entry as the plan.
update challenge_trades set planned_entry = entry where planned_entry is null;

notify pgrst, 'reload schema';
