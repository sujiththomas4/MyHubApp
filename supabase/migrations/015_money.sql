-- Money — Monthly EMIs, income sources, and money lent out.
--
-- emis:           defined monthly commitments (activity, amount, due day of the
--                 month, payment source account).
-- income_sources: monthly income used to cover the EMIs, so the app can show
--                 whether income covers commitments and how much is left.
-- money_lent:     people who took money and haven't fully returned it. Outstanding
--                 = amount - returned (derived in the app).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists emis (
  id text primary key,
  activity text not null,
  amount numeric not null default 0,
  due_day int,                               -- day of month money is deducted
  source text,                               -- payment source, e.g. "HDFC NRO"
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists income_sources (
  id text primary key,
  name text not null,
  amount numeric not null default 0,         -- monthly amount
  source text,                               -- account it lands in
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists money_lent (
  id text primary key,
  person text not null,
  amount numeric not null default 0,
  date_given date,
  reason text,
  returned numeric not null default 0,       -- returned so far
  returned_date date,
  note text,
  updated_at timestamptz not null default now()
);

-- RLS: same "any authenticated user" policy the other tables use.
do $$
declare t text;
begin
  foreach t in array array['emis', 'income_sources', 'money_lent'] loop
    execute format('alter table %I enable row level security;', t);
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = 'authed all'
    ) then
      execute format($p$create policy "authed all" on %I for all to authenticated using (true) with check (true);$p$, t);
    end if;
  end loop;
end $$;

-- Realtime across devices.
do $$
declare t text;
begin
  foreach t in array array['emis', 'income_sources', 'money_lent'] loop
    begin
      execute format('alter publication supabase_realtime add table %I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

notify pgrst, 'reload schema';
