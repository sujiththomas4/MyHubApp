-- Plantation — Flowers register for Plant Factory (tab beside Plants).
--
-- Unlike planned crops, which carry a fuzzy month-range planting window, a
-- flower plan is date-anchored at both ends: a specific start date and a
-- planned delivery date. The gap between them is the grow window, and the
-- delivery date is a commitment worth tracking against.
--
-- References (nursery, supplier, buyer, guidance video) live in their own
-- table, one-to-many, same shape as plantation_crop_contacts.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_flowers (
  id            text primary key,
  name          text not null,
  variety       text,
  status        text not null default 'planned',  -- planned|growing|ready|delivered|cancelled
  start_date    date,
  delivery_date date,
  quantity      int,
  location      text,
  note          text,
  image         text,
  sort_order    int not null default 0,
  updated_at    timestamptz not null default now()
);

create table if not exists plantation_flower_refs (
  id         text primary key,
  flower_id  text not null references plantation_flowers(id) on delete cascade,
  name       text,
  phone      text,
  address    text,
  youtube    text,
  note       text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists plantation_flower_refs_flower_idx on plantation_flower_refs (flower_id);

do $$
declare t text;
begin
  foreach t in array array['plantation_flowers','plantation_flower_refs'] loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='authed all') then
      execute format('create policy "authed all" on %I for all to authenticated using (true) with check (true)', t);
    end if;
    begin execute format('alter publication supabase_realtime add table %I', t); exception when duplicate_object then null; end;
  end loop;
end $$;

notify pgrst, 'reload schema';
