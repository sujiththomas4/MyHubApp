-- 062_fix_hdfc_first_emi.sql
-- The HDFC schedule started at Feb 2022, but the first installment was actually
-- paid in March 2022. Drop the spurious February row and renumber so March is
-- EMI #1. Clean delete + re-insert of the HDFC schedule (safe: matches the
-- corrected AppData seed).

begin;

delete from installments where loan_id = 'loan-hdfc';

insert into installments (id, loan_id, number, date, amount, status) values
  ('loan-hdfc-emi-1', 'loan-hdfc', 1, '2022-03-01', 10624, 'paid'),
  ('loan-hdfc-emi-2', 'loan-hdfc', 2, '2022-04-01', 10624, 'paid'),
  ('loan-hdfc-emi-3', 'loan-hdfc', 3, '2022-05-01', 10624, 'paid'),
  ('loan-hdfc-emi-4', 'loan-hdfc', 4, '2022-06-01', 10624, 'paid'),
  ('loan-hdfc-emi-5', 'loan-hdfc', 5, '2022-07-01', 10624, 'paid'),
  ('loan-hdfc-emi-6', 'loan-hdfc', 6, '2022-08-01', 10624, 'paid'),
  ('loan-hdfc-emi-7', 'loan-hdfc', 7, '2022-09-01', 10624, 'paid'),
  ('loan-hdfc-emi-8', 'loan-hdfc', 8, '2022-10-01', 10624, 'paid'),
  ('loan-hdfc-emi-9', 'loan-hdfc', 9, '2022-11-01', 10624, 'paid'),
  ('loan-hdfc-emi-10', 'loan-hdfc', 10, '2022-12-01', 10624, 'paid'),
  ('loan-hdfc-emi-11', 'loan-hdfc', 11, '2023-01-01', 10624, 'paid'),
  ('loan-hdfc-emi-12', 'loan-hdfc', 12, '2023-02-01', 10624, 'paid'),
  ('loan-hdfc-emi-13', 'loan-hdfc', 13, '2023-03-01', 10624, 'paid'),
  ('loan-hdfc-emi-14', 'loan-hdfc', 14, '2023-04-01', 10624, 'paid'),
  ('loan-hdfc-emi-15', 'loan-hdfc', 15, '2023-05-01', 10624, 'paid'),
  ('loan-hdfc-emi-16', 'loan-hdfc', 16, '2023-06-01', 10624, 'paid'),
  ('loan-hdfc-emi-17', 'loan-hdfc', 17, '2023-07-01', 10624, 'paid'),
  ('loan-hdfc-emi-18', 'loan-hdfc', 18, '2023-08-01', 10624, 'paid'),
  ('loan-hdfc-emi-19', 'loan-hdfc', 19, '2023-09-01', 10624, 'paid'),
  ('loan-hdfc-emi-20', 'loan-hdfc', 20, '2023-10-01', 10624, 'paid'),
  ('loan-hdfc-emi-21', 'loan-hdfc', 21, '2023-11-01', 10624, 'paid'),
  ('loan-hdfc-emi-22', 'loan-hdfc', 22, '2023-12-01', 10624, 'paid'),
  ('loan-hdfc-emi-23', 'loan-hdfc', 23, '2024-01-01', 10624, 'paid'),
  ('loan-hdfc-emi-24', 'loan-hdfc', 24, '2024-02-01', 10624, 'paid'),
  ('loan-hdfc-emi-25', 'loan-hdfc', 25, '2024-03-01', 10624, 'paid'),
  ('loan-hdfc-emi-26', 'loan-hdfc', 26, '2024-04-01', 10624, 'paid'),
  ('loan-hdfc-emi-27', 'loan-hdfc', 27, '2024-05-01', 10624, 'paid'),
  ('loan-hdfc-emi-28', 'loan-hdfc', 28, '2024-06-01', 10624, 'paid'),
  ('loan-hdfc-emi-29', 'loan-hdfc', 29, '2024-07-01', 10624, 'paid'),
  ('loan-hdfc-emi-30', 'loan-hdfc', 30, '2024-08-01', 10624, 'paid'),
  ('loan-hdfc-emi-31', 'loan-hdfc', 31, '2024-09-01', 10624, 'paid'),
  ('loan-hdfc-emi-32', 'loan-hdfc', 32, '2024-10-01', 10624, 'paid'),
  ('loan-hdfc-emi-33', 'loan-hdfc', 33, '2024-11-01', 10624, 'paid'),
  ('loan-hdfc-emi-34', 'loan-hdfc', 34, '2024-12-01', 10624, 'paid'),
  ('loan-hdfc-emi-35', 'loan-hdfc', 35, '2025-01-01', 10624, 'paid'),
  ('loan-hdfc-emi-36', 'loan-hdfc', 36, '2025-02-01', 10624, 'paid'),
  ('loan-hdfc-emi-37', 'loan-hdfc', 37, '2025-03-01', 10624, 'paid'),
  ('loan-hdfc-emi-38', 'loan-hdfc', 38, '2025-04-01', 10624, 'paid'),
  ('loan-hdfc-emi-39', 'loan-hdfc', 39, '2025-05-01', 10624, 'paid'),
  ('loan-hdfc-emi-40', 'loan-hdfc', 40, '2025-06-01', 10624, 'paid'),
  ('loan-hdfc-emi-41', 'loan-hdfc', 41, '2025-07-01', 10624, 'paid'),
  ('loan-hdfc-emi-42', 'loan-hdfc', 42, '2025-08-01', 10624, 'paid'),
  ('loan-hdfc-emi-43', 'loan-hdfc', 43, '2025-09-01', 10624, 'paid'),
  ('loan-hdfc-emi-44', 'loan-hdfc', 44, '2025-10-01', 10624, 'paid'),
  ('loan-hdfc-emi-45', 'loan-hdfc', 45, '2025-11-01', 10624, 'paid'),
  ('loan-hdfc-emi-46', 'loan-hdfc', 46, '2025-12-01', 10624, 'paid'),
  ('loan-hdfc-emi-47', 'loan-hdfc', 47, '2026-01-01', 10624, 'paid'),
  ('loan-hdfc-emi-48', 'loan-hdfc', 48, '2026-02-01', 10624, 'paid'),
  ('loan-hdfc-emi-49', 'loan-hdfc', 49, '2026-03-01', 10624, 'paid'),
  ('loan-hdfc-emi-50', 'loan-hdfc', 50, '2026-04-01', 10624, 'paid'),
  ('loan-hdfc-emi-51', 'loan-hdfc', 51, '2026-05-01', 10624, 'paid'),
  ('loan-hdfc-emi-52', 'loan-hdfc', 52, '2026-06-01', 10624, 'paid'),
  ('loan-hdfc-emi-53', 'loan-hdfc', 53, '2026-07-01', 10624, 'not paid');

commit;
