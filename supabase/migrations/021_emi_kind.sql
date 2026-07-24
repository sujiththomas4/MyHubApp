-- Money — mark each monthly item as an EMI or a general expense.
--
-- The `emis` table now holds both loan/chit EMIs and recurring expenses (maid
-- salary, rent, subscriptions…). `kind` is 'emi' or 'expense'; existing rows
-- default to 'emi'. EMIs get a small label in the UI.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table emis
  add column if not exists kind text not null default 'emi';

notify pgrst, 'reload schema';
