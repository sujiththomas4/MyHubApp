-- Trading Challenge — clean-trades log. Each trade records the pre-defined SL &
-- target, the market read, the logic, the result, and which rules were followed
-- (so the page can show how many rules were kept vs broken). `challenge` lets the
-- same table serve the 10 / 20 / 30-trade challenges.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists challenge_trades (
  id text primary key,
  challenge text not null default '10-clean',
  date date,
  symbol text,
  side text,                       -- sell_ce | sell_pe | other
  qty int default 65,
  entry numeric,
  sl numeric,
  target numeric,
  market_read text,
  logic text,
  result text default 'open',      -- open | win | loss | breakeven
  exit numeric,
  pnl numeric,
  rules jsonb default '{}'::jsonb,  -- { ruleId: true/false }
  note text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table challenge_trades enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'challenge_trades' and policyname = 'authed all'
  ) then
    create policy "authed all" on challenge_trades for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table challenge_trades;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
