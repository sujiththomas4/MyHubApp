-- Personal — GYM Workouts.
--
-- No recurrence (unlike routines): you plan workouts date-by-date, in advance.
--
-- gym_exercises: a small library of defined activities you reuse when planning
--   (e.g. "Bench press" / Chest, "Full body circuit" / Full body).
-- gym_plan: the actual planned items for a date. `name`/`part` are snapshotted
--   from the library at plan time so a plan survives later library edits/deletes.
--   `done` + `comment` are filled in when you execute the workout.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists gym_exercises (
  id text primary key,
  name text not null,
  part text,                                 -- body part / group
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists gym_plan (
  id text primary key,
  date date not null,
  exercise_id text,                          -- optional link to library
  name text not null,                        -- snapshot
  part text,
  target text,                               -- e.g. "4 x 10", "3 sets"
  done boolean not null default false,
  comment text,                              -- actual: weight / reps / notes
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

-- RLS: same "any authenticated user" policy the other tables use.
do $$
declare t text;
begin
  foreach t in array array['gym_exercises', 'gym_plan'] loop
    execute format('alter table %I enable row level security;', t);
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = 'authed all'
    ) then
      execute format($p$create policy "authed all" on %I for all to authenticated using (true) with check (true);$p$, t);
    end if;
  end loop;
end $$;

-- Realtime, so a workout ticked on one device shows up on the others.
do $$
declare t text;
begin
  foreach t in array array['gym_exercises', 'gym_plan'] loop
    begin
      execute format('alter publication supabase_realtime add table %I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

notify pgrst, 'reload schema';
