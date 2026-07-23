-- Daily Option Selling — Backtest entries.
--
-- Each row is one dated/timed backtest: a set of option legs entered by hand,
-- e.g. "24300 CE @90 SELL". The legs live in a jsonb array; each leg is
-- { strike, type ('CE'|'PE'), price (entry), side ('SELL'|'BUY'), exit }.
-- exit is the closing price (a SELL closes with a BUY and vice-versa); it is
-- null/absent while the leg is still open. Per-leg P&L is derived in the app.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists option_selling_backtests (
  id text primary key,
  date date not null,
  time text,                        -- entry time, e.g. "09:30"
  legs jsonb not null default '[]', -- [{ strike, type, price, side, exit }]
  notes text,
  updated_at timestamptz not null default now()
);

-- RLS: same "any authenticated user" policy the other tables use.
alter table option_selling_backtests enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'option_selling_backtests' and policyname = 'authed all'
  ) then
    create policy "authed all" on option_selling_backtests
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Realtime, so a backtest saved on one device shows up on the others.
do $$
begin
  alter publication supabase_realtime add table option_selling_backtests;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
