-- Morning trades: a dated pre-open observation — a global-market screenshot, a
-- chart screenshot, a rich-text note, market breadth (advances/declines) and the
-- pre-market price move (+/-). Separate from chart_patterns.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists morning_trades (
  id text primary key,
  date date not null,
  observation text,                 -- rich-text HTML
  advances int,
  declines int,
  premarket numeric,                -- pre-market price move: + up / - down
  global_image text,                -- global-market screenshot (Storage URL)
  chart_image text,                 -- chart screenshot (Storage URL)
  updated_at timestamptz not null default now()
);

-- RLS: same "any authenticated user" policy the other tables use.
alter table morning_trades enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'morning_trades' and policyname = 'authed all'
  ) then
    create policy "authed all" on morning_trades
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Realtime, so a morning trade saved on one device shows up on the others.
do $$
begin
  alter publication supabase_realtime add table morning_trades;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
