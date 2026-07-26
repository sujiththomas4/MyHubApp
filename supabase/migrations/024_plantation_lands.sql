-- Plantation — property lands and their full planting hierarchy.
--
-- Hierarchy:
--   plantation_lands      a property (owned or leased)
--   > plantation_zones    plots within a land (e.g. 1 acre split into 4 zones)
--     > plantation_zone_items   what's in the zone (water reservoir, shed, …)
--     > plantation_verticals    rows (enabled when the zone holds plants)
--       > plantation_poles      supporting posts (payyani/PVC/concrete/plant)
--         > plantation_plants   plants on a pole (1..n), each individually tagged
--         > plantation_care     watering / fertilizer schedule, pole-wise
--         > plantation_defects  defect identified -> remedy applied -> result
--
-- Images are stored in Storage; rows hold the public URL. Everything is backend
-- only so multiple people can update these screens concurrently.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_lands (
  id text primary key,
  name text not null,
  location text,
  area numeric,
  area_unit text default 'acre',        -- acre | cent | sqft | hectare
  ownership text default 'owned',        -- owned | leased
  lease_from date,
  lease_to date,
  note text,
  image text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists plantation_zones (
  id text primary key,
  land_id text not null,
  name text not null,
  area numeric,
  area_unit text default 'cent',
  has_verticals boolean not null default false,   -- plants / rows enabled
  note text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists plantation_zone_items (
  id text primary key,
  zone_id text not null,
  name text not null,
  kind text,                              -- water-reservoir | plants | shed | pump | other
  quantity numeric,
  note text,
  image text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists plantation_verticals (
  id text primary key,
  zone_id text not null,
  name text not null,
  note text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists plantation_poles (
  id text primary key,
  vertical_id text not null,
  label text,                             -- pole number / code
  pole_type text,                         -- payyani | pvc | concrete | plant | other
  note text,
  image text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists plantation_plants (
  id text primary key,
  pole_id text not null,
  tag text,                               -- unique plant tag / label
  variety text,
  planted_date date,
  status text default 'healthy',          -- healthy | defect | dead
  note text,
  image text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists plantation_care (
  id text primary key,
  pole_id text not null,
  type text not null,                     -- watering | fertilizer
  product text,
  quantity text,
  scheduled_date date,
  done boolean not null default false,
  done_date date,
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists plantation_defects (
  id text primary key,
  pole_id text,
  plant_id text,
  title text not null,
  description text,
  identified_date date,
  remedy text,
  remedy_date date,
  result text,
  status text default 'open',             -- open | treating | resolved
  image text,
  updated_at timestamptz not null default now()
);

-- RLS + realtime for every table.
do $$
declare t text;
begin
  foreach t in array array[
    'plantation_lands','plantation_zones','plantation_zone_items','plantation_verticals',
    'plantation_poles','plantation_plants','plantation_care','plantation_defects'
  ] loop
    execute format('alter table %I enable row level security;', t);
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'authed all'
    ) then
      execute format($p$create policy "authed all" on %I for all to authenticated using (true) with check (true);$p$, t);
    end if;
    begin
      execute format('alter publication supabase_realtime add table %I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

notify pgrst, 'reload schema';
