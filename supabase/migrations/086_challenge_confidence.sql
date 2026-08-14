-- Clean-trades challenge: confidence in the setup (high | maybe | not_sure |
-- against), captured while planning the trade.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table challenge_trades
  add column if not exists confidence text;

notify pgrst, 'reload schema';
