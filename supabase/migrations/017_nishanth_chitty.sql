-- Savings — add "Nishanth Chitty" as a savings category.
--
-- Chit-fund savings. Once the category exists, its holdings appear on the
-- Savings overview and count toward the savings totals like any other category
-- (add the actual amounts via the category screen).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

insert into savings_categories (slug, name, icon, currency)
values ('nishanth-chitty', 'Nishanth Chitty', 'ri-group-line', 'INR')
on conflict (slug) do nothing;
