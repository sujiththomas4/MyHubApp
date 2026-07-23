-- Loans — add two KSFE chitties as zero-interest loans.
--
-- A chitty behaves like an interest-free loan: amount = monthly x months, EMI =
-- monthly, outstanding = amount - paid installments. Because EMI x tenure equals
-- the amount, the app's rate solver returns 0% (no interest).
--
--   KSFE Chitty 25k: 24/02/2026 -> 24/05/2029, 40 x 25,000 = 10,00,000, 6 paid
--   KSFE Chitty 10k: 27/02/2026 -> 27/07/2028, 30 x 10,000 = 3,00,000, 6 paid
--
-- Only the PAID installments are seeded (up to the current month). Future months
-- are intentionally not inserted, so the loan page shows paid history only and no
-- "mark as paid" rows for months that haven't happened yet.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

insert into loans (id, bank_name, amount, currency, start_date, end_date, emi, outstanding_amount, location) values
  ('loan-ksfe-25k', 'KSFE Chitty 25k', 1000000, 'INR', '2026-02-24', '2029-05-24', 25000, 850000, 'India'),
  ('loan-ksfe-10k', 'KSFE Chitty 10k',  300000, 'INR', '2026-02-27', '2028-07-27', 10000, 240000, 'India')
on conflict (id) do nothing;

insert into installments (id, loan_id, number, date, amount, status)
select 'ksfe25k-emi-' || n, 'loan-ksfe-25k', n,
       (date '2026-02-24' + make_interval(months => n - 1))::date, 25000, 'paid'
from generate_series(1, 6) as n
on conflict (id) do nothing;

insert into installments (id, loan_id, number, date, amount, status)
select 'ksfe10k-emi-' || n, 'loan-ksfe-10k', n,
       (date '2026-02-27' + make_interval(months => n - 1))::date, 10000, 'paid'
from generate_series(1, 6) as n
on conflict (id) do nothing;

notify pgrst, 'reload schema';
