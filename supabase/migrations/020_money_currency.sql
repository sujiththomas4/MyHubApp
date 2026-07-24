-- Money — add a currency (INR / AED) to EMIs, income sources and money lent.
--
-- Totals are shown in INR (AED converted via the app's FX rate), like the Loans
-- and Savings screens.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table emis           add column if not exists currency text not null default 'INR';
alter table income_sources add column if not exists currency text not null default 'INR';
alter table money_lent     add column if not exists currency text not null default 'INR';

notify pgrst, 'reload schema';