-- Personal — Daily Routines.
--
-- routines: the definitions. `schedule` is:
--   'daily'  — every day
--   'weekly' — only the weekdays listed in days[] (0=Sun … 6=Sat);
--              e.g. every day except Sunday = {1,2,3,4,5,6}
--   'once'   — a single calendar day, on_date
--
-- routine_logs: per-date completion. id is deterministic ("<routine>__<date>")
-- so ticking/unticking a routine for a day upserts cleanly.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists routines (
  id text primary key,
  title text not null,
  schedule text not null default 'daily',   -- 'daily' | 'weekly' | 'once'
  days int[] not null default '{}',          -- weekdays for 'weekly' (0=Sun..6=Sat)
  on_date date,                              -- for 'once'
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists routine_logs (
  id text primary key,                       -- "<routine_id>__<date>"
  routine_id text not null,
  date date not null,
  done boolean not null default false,
  comment text,
  updated_at timestamptz not null default now()
);

-- RLS: same "any authenticated user" policy the other tables use.
do $$
declare t text;
begin
  foreach t in array array['routines', 'routine_logs'] loop
    execute format('alter table %I enable row level security;', t);
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = 'authed all'
    ) then
      execute format($p$create policy "authed all" on %I for all to authenticated using (true) with check (true);$p$, t);
    end if;
  end loop;
end $$;

-- Realtime, so a routine ticked on one device shows up on the others.
do $$
declare t text;
begin
  foreach t in array array['routines', 'routine_logs'] loop
    begin
      execute format('alter publication supabase_realtime add table %I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

notify pgrst, 'reload schema';
