-- Clean-trades challenge: each trade has a direction (buy | sell) so SL / target
-- / captured points are computed correctly for both.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table challenge_trades
  add column if not exists dir text default 'sell';

notify pgrst, 'reload schema';
