-- Loans — reconcile KSFE chitties if migration 018 was run in its earlier form.
--
--  1. Correct the totals: each chitty had one installment too few (39/29). The
--     right tenure is 40 x 25,000 = 10,00,000 and 30 x 10,000 = 3,00,000.
--  2. Remove the future "not paid" installment rows so the loan page shows paid
--     history only (no "mark as paid" rows for months that haven't happened).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

update loans set amount = 1000000, outstanding_amount = 850000 where id = 'loan-ksfe-25k';
update loans set amount =  300000, outstanding_amount = 240000 where id = 'loan-ksfe-10k';

-- Keep only the paid history; drop future/unpaid installment rows.
delete from installments
where loan_id in ('loan-ksfe-25k', 'loan-ksfe-10k')
  and status <> 'paid';

notify pgrst, 'reload schema';
