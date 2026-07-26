-- Plantation — pepper plant bookings (sapling orders).
--
-- Each row: a customer booking N pepper plants of a variety, with a rate,
-- advance paid and delivery status. Amount (= quantity x rate) and balance
-- (= amount - advance) are derived in the app.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_pepper_bookings (
  id text primary key,
  customer text not null,
  phone text,
  variety text,
  quantity numeric not null default 0,
  rate numeric not null default 0,
  advance numeric not null default 0,
  booking_date date,
  delivery_date date,
  status text not null default 'booked',   -- booked | delivered | cancelled
  note text,
  created_at timestamptz not null default now()
);

alter table plantation_pepper_bookings enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='plantation_pepper_bookings' and policyname='authed all') then
    create policy "authed all" on plantation_pepper_bookings for all to authenticated using (true) with check (true);
  end if;
  begin alter publication supabase_realtime add table plantation_pepper_bookings; exception when duplicate_object then null; end;
end $$;

-- Seed a "Pepper Variety" master-data list for the variety picker.
insert into lookups (id, list, value, sort_order) values
  ('lk-pv-1', 'Pepper Variety', 'Panniyur-1', 1),
  ('lk-pv-2', 'Pepper Variety', 'Karimunda', 2),
  ('lk-pv-3', 'Pepper Variety', 'Thekken', 3),
  ('lk-pv-4', 'Pepper Variety', 'Vijay', 4)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
