-- Clean-trades challenge: attach a screenshot (e.g. the exit chart) to a trade.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table challenge_trades
  add column if not exists image text;

notify pgrst, 'reload schema';
