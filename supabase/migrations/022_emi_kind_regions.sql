-- Money — expense kinds become region-based: EMI, Sharjah Expense, India Expense.
--
-- Existing 'expense' rows are remapped to 'sharjah-expense'. 'emi' and 'savings'
-- rows are unchanged. Re-tag individual items to 'india-expense' in the app as
-- needed.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

update emis set kind = 'sharjah-expense' where kind = 'expense';

notify pgrst, 'reload schema';
