-- Plantation — a unified updates / observations timeline for every hierarchy node
-- (zone, row/vertical, pole, plant, and land). One log powers both the per-node
-- timeline view and the Defects screen.
--
--   type: regular  — a plain observation
--         defect   — a problem; carries a running thread of remedy/result children
--         dead     — the plant/node died
--         recovered— back to healthy
--         remedy   — a treatment applied to a defect  (parent_id -> defect)
--         result   — the outcome of a remedy           (parent_id -> defect)
--
-- Remedy/result children share the parent defect's entity_type/entity_id so a
-- node's whole timeline is one query and cascade-delete is a single filter.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_updates (
  id text primary key,
  entity_type text not null default 'plant',   -- land | zone | vertical | pole | plant
  entity_id text not null default '',
  land_id text,                                 -- denormalised for property scoping
  date date,
  type text not null default 'regular',         -- regular | defect | dead | recovered | remedy | result
  title text,
  detail text,
  image text,
  status text,                                  -- defects only: open | treating | resolved
  parent_id text,                               -- remedy/result -> the defect update
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plantation_updates_entity on plantation_updates (entity_type, entity_id);
create index if not exists idx_plantation_updates_parent on plantation_updates (parent_id);
create index if not exists idx_plantation_updates_land   on plantation_updates (land_id);

-- ---- Migrate existing defects into the unified log (idempotent by id) --------
-- The defect itself.
insert into plantation_updates (id, entity_type, entity_id, land_id, date, type, title, detail, image, status)
select d.id,
       case when coalesce(d.plant_id,'') <> '' then 'plant'
            when coalesce(d.pole_id,'')  <> '' then 'pole'
            else 'land' end,
       coalesce(nullif(d.plant_id,''), nullif(d.pole_id,''), nullif(d.land_id,''), ''),
       d.land_id, d.identified_date, 'defect', d.title, d.description, d.image, coalesce(d.status,'open')
from plantation_defects d
where not exists (select 1 from plantation_updates u where u.id = d.id);

-- Its remedy, as a child.
insert into plantation_updates (id, entity_type, entity_id, land_id, date, type, detail, parent_id)
select d.id || '-rem',
       case when coalesce(d.plant_id,'') <> '' then 'plant'
            when coalesce(d.pole_id,'')  <> '' then 'pole'
            else 'land' end,
       coalesce(nullif(d.plant_id,''), nullif(d.pole_id,''), nullif(d.land_id,''), ''),
       d.land_id, d.remedy_date, 'remedy', d.remedy, d.id
from plantation_defects d
where coalesce(d.remedy,'') <> ''
  and not exists (select 1 from plantation_updates u where u.id = d.id || '-rem');

-- Its result, as a child.
insert into plantation_updates (id, entity_type, entity_id, land_id, date, type, detail, parent_id)
select d.id || '-res',
       case when coalesce(d.plant_id,'') <> '' then 'plant'
            when coalesce(d.pole_id,'')  <> '' then 'pole'
            else 'land' end,
       coalesce(nullif(d.plant_id,''), nullif(d.pole_id,''), nullif(d.land_id,''), ''),
       d.land_id, d.remedy_date, 'result', d.result, d.id
from plantation_defects d
where coalesce(d.result,'') <> ''
  and not exists (select 1 from plantation_updates u where u.id = d.id || '-res');

-- ---- RLS + realtime ---------------------------------------------------------
alter table plantation_updates enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'plantation_updates' and policyname = 'authed all'
  ) then
    create policy "authed all" on plantation_updates for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table plantation_updates;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
