-- Nifty–Gold trades get a term: 'long' (accumulate, never sold) or 'short'
-- (rotate — squared off when switching). Sells apply to short-term holdings only.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table ng_trades
  add column if not exists term text;

-- Existing buys default to long-term (accumulation).
update ng_trades set term = 'long' where action = 'buy' and term is null;

notify pgrst, 'reload schema';
