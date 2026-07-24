-- Money — income sources can be monthly (recurring) or lump-sum (one-off).
--
-- `frequency` is 'monthly' or 'lumpsum'; existing rows default to 'monthly'.
-- Monthly income funds the monthly outgoings; lump-sum is shown as an available
-- reserve.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table income_sources
  add column if not exists frequency text not null default 'monthly';

notify pgrst, 'reload schema';
