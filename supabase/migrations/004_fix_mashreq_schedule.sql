-- Mashreq loan: the schedule was missing its first EMI.
--
-- The loan record said it started 2026-01-01 while the first installment on
-- record was 2026-03-01. Correct position: it starts 2026-02-01, and that
-- February EMI was paid.
--
-- The five existing rows are shifted up one place (ids AND numbers) so the new
-- February row can take #1. Renaming is done in DESCENDING order so each id is
-- free before the next row moves into it — renaming ascending would collide on
-- the primary key.
--
-- Resulting schedule: 6 EMIs, Feb..Jul 2026, all paid.

begin;

-- 1. The loan starts in February, not January.
update loans
   set start_date = '2026-02-01'
 where id = 'loan-mashreq';

-- 2. Shift the existing five EMIs from 1..5 to 2..6.
update installments set id = 'loan-mashreq-emi-6', number = 6 where id = 'loan-mashreq-emi-5';
update installments set id = 'loan-mashreq-emi-5', number = 5 where id = 'loan-mashreq-emi-4';
update installments set id = 'loan-mashreq-emi-4', number = 4 where id = 'loan-mashreq-emi-3';
update installments set id = 'loan-mashreq-emi-3', number = 3 where id = 'loan-mashreq-emi-2';
update installments set id = 'loan-mashreq-emi-2', number = 2 where id = 'loan-mashreq-emi-1';

-- 3. February becomes EMI #1, paid.
insert into installments (id, loan_id, number, date, amount, status)
values ('loan-mashreq-emi-1', 'loan-mashreq', 1, '2026-02-01', 5150, 'paid')
on conflict (id) do update
  set number = excluded.number,
      date   = excluded.date,
      amount = excluded.amount,
      status = excluded.status;

commit;

-- Verify — expect 6 rows, Feb..Jul, numbers 1..6, all paid.
select i.number, i.id, i.date, i.amount, i.status
  from installments i
 where i.loan_id = 'loan-mashreq'
 order by i.number;
