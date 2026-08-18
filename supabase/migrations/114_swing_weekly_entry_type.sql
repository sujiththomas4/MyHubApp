-- Swing Weekly — which of the two entry points a trade came from, plus a
-- scratchpad for screener candidates.
--
-- The book has exactly two ways in:
--   STRENGTH     - weekly strength
--   PULLBACK20W  - pullback to the 20-week EMA
-- Recorded per trade so the two can be compared later; they are different
-- setups and there is no reason to assume they perform alike.
--
-- swing1h_backtest_notes is a manual list: jot a date and a symbol during the
-- week, then check it against the real screener at the weekend.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table swing1h_trades add column if not exists entry_type text;

create table if not exists swing1h_backtest_notes (
  id         text primary key,
  note_date  date not null,
  symbol     text not null,
  note       text,
  checked    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists swing1h_backtest_notes_date_idx on swing1h_backtest_notes (note_date);

alter table swing1h_backtest_notes enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='swing1h_backtest_notes' and policyname='authed all') then
    create policy "authed all" on swing1h_backtest_notes for all to authenticated using (true) with check (true);
  end if;
  begin alter publication supabase_realtime add table swing1h_backtest_notes; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
