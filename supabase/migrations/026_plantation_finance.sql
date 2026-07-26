-- Plantation — capital, expenses and user designations.
--
--   profiles.designation   CEO / CFO / Partner / Supervisor / Worker …
--   plantation_capital      money contributed into the venture
--   plantation_expenses     money spent; `source` = 'capital' (from the business
--                           pool) or 'personal' (an individual fronted it, so it
--                           is owed back until `settled`).
--
-- Balance = capital - expenses. "Owed to individuals" = unsettled personal
-- expenses. Images (receipts / bills) live in Storage as URLs.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table profiles add column if not exists designation text;

create table if not exists plantation_capital (
  id text primary key,
  contributor text not null,
  amount numeric not null default 0,
  date date,
  note text,
  image text,
  created_at timestamptz not null default now()
);

create table if not exists plantation_expenses (
  id text primary key,
  title text not null,
  amount numeric not null default 0,
  bill_date date,
  paid_by text,
  source text not null default 'capital',   -- capital | personal
  settled boolean not null default true,
  settled_date date,
  note text,
  image text,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['plantation_capital', 'plantation_expenses'] loop
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
