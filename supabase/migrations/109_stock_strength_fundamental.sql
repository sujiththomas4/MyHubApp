-- Stock Strength — flag the fundamentally strong names.
--
-- Trend / strength / bias are chart reads that change week to week. This is the
-- slower judgement underneath them, so it gets its own column rather than
-- another value in the strength enum. Flagged names sort to the top of the
-- table regardless of the column you are sorting by.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table stock_strength
  add column if not exists fundamentally_strong boolean not null default false;

notify pgrst, 'reload schema';
