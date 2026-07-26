-- Master data (dropdown lists) + expense category + people-picker access.
--
--   lookups        configurable dropdown values: (list, value). e.g. the
--                  "Expense Category" list feeds the expense screen's Category.
--   expenses.category   the chosen category for an expense.
--   profiles read  relaxed to any authenticated user so people-picker dropdowns
--                  (Paid by, Contributor…) can list everyone. Role changes stay
--                  admin-only.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists lookups (
  id text primary key,
  list text not null,               -- dropdown name, e.g. 'Expense Category'
  value text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table plantation_expenses add column if not exists category text;

-- lookups: everyone reads; only admins write.
alter table lookups enable row level security;
drop policy if exists "lookups read" on lookups;
create policy "lookups read" on lookups for select to authenticated using (true);
drop policy if exists "lookups admin write" on lookups;
create policy "lookups admin write" on lookups for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- profiles: allow any authenticated user to read (names for people pickers).
drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles for select to authenticated using (true);

do $$ begin alter publication supabase_realtime add table lookups; exception when duplicate_object then null; end $$;

-- Seed a starter "Expense Category" list.
insert into lookups (id, list, value, sort_order) values
  ('lk-ec-1', 'Expense Category', 'Fertilizer', 1),
  ('lk-ec-2', 'Expense Category', 'Pesticide', 2),
  ('lk-ec-3', 'Expense Category', 'Seeds / Saplings', 3),
  ('lk-ec-4', 'Expense Category', 'Wages / Labour', 4),
  ('lk-ec-5', 'Expense Category', 'Equipment', 5),
  ('lk-ec-6', 'Expense Category', 'Transport', 6),
  ('lk-ec-7', 'Expense Category', 'Utilities', 7),
  ('lk-ec-8', 'Expense Category', 'Miscellaneous', 8)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
