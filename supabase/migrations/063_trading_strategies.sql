-- Trading strategies — a playbook of setups across option buying/selling and
-- stocks (long-term / swing / intraday). Each strategy records entry & exit
-- conditions, optional entry/exit times, an averaging plan, minimum capital,
-- win probability, and a list of reference links (each with a note).
--
-- Links are stored as JSONB: [{ "url": "...", "note": "..." }, ...] — they are
-- always edited together with the strategy, so a child table adds no value.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists trading_strategies (
  id text primary key,
  name text not null,
  type text not null default 'option_buying', -- see STRATEGY_TYPES in the app
  entry_conditions text,
  entry_time text,                             -- optional, free text (e.g. "9:20 AM")
  exit_time text,                              -- optional
  exit_conditions text,
  averaging text,                             -- how to average, if at all
  min_capital numeric,                        -- minimum capital required
  win_probability numeric,                    -- % chance of winning (0-100)
  links jsonb not null default '[]'::jsonb,    -- [{ url, note }]
  note text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table trading_strategies enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'trading_strategies' and policyname = 'authed all'
  ) then
    create policy "authed all" on trading_strategies for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table trading_strategies;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
