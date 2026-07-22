-- More detail on a morning trade: a pre-market opening screenshot, previous-day
-- premium for CE & PE, the +5min screenshots (Nifty / CE / PE) and the candle
-- move (Close - Open).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table morning_trades
  add column if not exists premarket_image text,   -- pre-market opening screenshot
  add column if not exists premium_ce numeric,     -- previous-day premium, CE
  add column if not exists premium_pe numeric,     -- previous-day premium, PE
  add column if not exists candle_moved numeric,   -- Close - Open
  add column if not exists nifty5_image text,      -- Nifty after 5 min
  add column if not exists ce5_image text,         -- CE after 5 min
  add column if not exists pe5_image text;         -- PE after 5 min

notify pgrst, 'reload schema';
