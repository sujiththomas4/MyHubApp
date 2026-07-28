-- Plantation — "Records": documented procedures (things done, with the steps we
-- took, e.g. getting an electricity connection) and a general contacts directory
-- (broker, electrician, officer…). Backend-only.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_procedures (
  id text primary key,
  title text not null,
  category text,
  status text not null default 'done',    -- planned | in_progress | done
  summary text,
  date date,
  note text,
  image text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists plantation_procedure_steps (
  id text primary key,
  procedure_id text not null,
  step text,
  done boolean not null default false,
  date date,
  note text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists plantation_contacts (
  id text primary key,
  name text not null,
  role text,
  phone text,
  email text,
  address text,
  note text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_proc_steps_proc on plantation_procedure_steps (procedure_id);

do $$
declare t text;
begin
  foreach t in array array['plantation_procedures','plantation_procedure_steps','plantation_contacts'] loop
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

-- Seed starter dropdown lists.
insert into lookups (id, list, value, sort_order) values
  ('lk-ct-1', 'Contact Type', 'Broker', 1),
  ('lk-ct-2', 'Contact Type', 'Electrician', 2),
  ('lk-ct-3', 'Contact Type', 'Plumber', 3),
  ('lk-ct-4', 'Contact Type', 'Nursery', 4),
  ('lk-ct-5', 'Contact Type', 'Govt officer', 5),
  ('lk-ct-6', 'Contact Type', 'Labour / worker', 6),
  ('lk-ct-7', 'Contact Type', 'Supplier', 7),
  ('lk-ct-8', 'Contact Type', 'Other', 8),
  ('lk-pc-1', 'Procedure Category', 'Electricity', 1),
  ('lk-pc-2', 'Procedure Category', 'Water', 2),
  ('lk-pc-3', 'Procedure Category', 'Legal / documents', 3),
  ('lk-pc-4', 'Procedure Category', 'Land', 4),
  ('lk-pc-5', 'Procedure Category', 'Finance', 5),
  ('lk-pc-6', 'Procedure Category', 'Other', 6)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
