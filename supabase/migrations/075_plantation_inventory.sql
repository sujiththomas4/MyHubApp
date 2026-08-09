-- Plantation supplies / inventory: items needed for the plantation (gloves, grow
-- bags with a size spec, boots…). Each item is either already purchased or to be
-- purchased, with a unit price and quantity; total = unit_price * units.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_inventory (
  id text primary key,
  name text not null,
  specification text,
  status text not null default 'to_buy',   -- to_buy | purchased
  unit_price numeric,
  units numeric,
  note text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table plantation_inventory enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'plantation_inventory' and policyname = 'authed all'
  ) then
    create policy "authed all" on plantation_inventory for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table plantation_inventory;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
