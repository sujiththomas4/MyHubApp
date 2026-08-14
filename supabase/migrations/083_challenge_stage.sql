-- Clean-trades challenge lifecycle: plan a trade, mark it active on entry, then
-- exit it. Adds stage (planned | active | closed), setup_type (support |
-- resistance) and entry_trigger (zone | confirmation).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table challenge_trades
  add column if not exists stage text default 'planned',
  add column if not exists setup_type text,
  add column if not exists entry_trigger text;

-- Existing trades were already taken: closed if they carry a result, else active.
update challenge_trades
   set stage = case when result in ('win', 'loss', 'breakeven') then 'closed' else 'active' end
 where stage is null or stage = 'planned';

notify pgrst, 'reload schema';
