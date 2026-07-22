-- Flags a chart pattern as a "Morning Opening Trades" setup, so it can be
-- reviewed separately from the daily featured patterns on Before I Trade.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table chart_patterns
  add column if not exists morning boolean not null default false;

notify pgrst, 'reload schema';
