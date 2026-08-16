-- Focus 25 / Metal 25 — allow a one-time "lumpsum" seed allotment alongside the
-- monthly ones. Adds a type column and makes uniqueness (plan, month, type) so a
-- lumpsum and a monthly can coexist in the same month. The pending-month banner
-- reads only type='monthly'.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table ee_stock_allotments add column if not exists type text not null default 'monthly';

-- Replace the old (plan_code, allotment_month) unique with (plan_code, allotment_month, type).
alter table ee_stock_allotments drop constraint if exists ee_stock_allotments_plan_code_allotment_month_key;
create unique index if not exists uq_ee_stock_allotment_ptm on ee_stock_allotments (plan_code, allotment_month, type);

notify pgrst, 'reload schema';
