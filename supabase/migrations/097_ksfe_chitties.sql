-- Savings — add two KSFE chit-fund categories, each with a default monthly
-- investment amount that prefills the "Add holding" form.
--
-- Once added they appear on the Savings overview + count toward savings totals
-- on the dashboard like any other category (add the actual amounts via the
-- category screen).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table savings_categories add column if not exists default_invested numeric;

insert into savings_categories (slug, name, icon, currency, default_invested) values
  ('ksfe-chitty-10k', 'KSFE Chitty x 10K (3L)', 'ri-group-line', 'INR', 10000),
  ('ksfe-chitty-8k',  'KSFE Chitty x 8K (2L)',  'ri-group-line', 'INR', 8000)
on conflict (slug) do update
  set name = excluded.name, icon = excluded.icon, currency = excluded.currency, default_invested = excluded.default_invested;

notify pgrst, 'reload schema';
