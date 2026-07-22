-- Morning trade: previous-day CE/PE screenshots and the +5min change of each
-- leg (Nifty / CE / PE) captured below its screenshot.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table morning_trades
  add column if not exists ce_prev_image text,   -- CE previous day screenshot
  add column if not exists pe_prev_image text,   -- PE previous day screenshot
  add column if not exists nifty5_change numeric, -- Nifty move in first 5 min
  add column if not exists ce5_change numeric,    -- CE move in first 5 min
  add column if not exists pe5_change numeric;    -- PE move in first 5 min

notify pgrst, 'reload schema';
