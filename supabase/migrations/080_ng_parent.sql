-- A sell is now tied to the specific buy lot it squares off (parent_id), so P&L
-- is computed per lot and each buy row can be sold from the table.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table ng_trades
  add column if not exists parent_id text;

notify pgrst, 'reload schema';
