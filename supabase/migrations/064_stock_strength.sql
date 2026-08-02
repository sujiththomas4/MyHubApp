-- Stock strength — a watch-table of stocks with observations. Each row rates a
-- stock's trend / strength / bias with a note, so the whole list can be sorted
-- and filtered to find the strongest setups.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists stock_strength (
  id text primary key,
  symbol text not null,
  name text,
  sector text,
  trend text,        -- up | side | down
  strength text,     -- strong | moderate | weak
  bias text,         -- bullish | neutral | bearish
  rating numeric,    -- 1-5
  observation text,
  updated_date date,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table stock_strength enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'stock_strength' and policyname = 'authed all'
  ) then
    create policy "authed all" on stock_strength for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table stock_strength;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
