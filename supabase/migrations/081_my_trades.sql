-- My Trades: a simple observation log. Each entry has a date+time, the market
-- bias / VIX / crude outlook, an observation with a screenshot, and (added
-- later) a result with screenshot, justification and key takeaway.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists my_trades (
  id text primary key,
  obs_date date,
  obs_time text,
  bias text,
  vix text,
  crude text,
  observation text,
  obs_image text,
  result_image text,
  justification text,
  key_takeaway text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table my_trades enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='my_trades' and policyname='authed all') then
    create policy "authed all" on my_trades for all to authenticated using (true) with check (true);
  end if;
  begin alter publication supabase_realtime add table my_trades; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
