-- 50 & 200 EMA Support — a long-term accumulation book.
--
-- Shape differs from the swing books on purpose. There is one row per STOCK
-- that you hold forever and keep adding to, and a separate lot per buy or sell.
-- Quantity, average cost, invested and realised P&L are all DERIVED from the
-- lots, never stored, so the numbers cannot drift away from the history.
--
-- The accumulation rule: add again when price is 10 percent below the last buy.
-- ema_50 / ema_200 are the support levels the screen is named for.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists ee_ema_positions (
  id          text primary key,
  symbol      text not null unique,
  name        text,
  sector      text,
  bucket      text,
  thesis      text,                 -- why this is in the long-term book
  ema_50      numeric,
  ema_200     numeric,
  ltp         numeric,
  levels_at   timestamptz,          -- when ema / ltp were last refreshed
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists ee_ema_lots (
  id          text primary key,
  position_id text not null references ee_ema_positions(id) on delete cascade,
  side        text not null default 'BUY',   -- BUY | SELL
  qty         numeric not null,
  price       numeric not null,
  trade_date  date not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists ee_ema_lots_position_idx on ee_ema_lots (position_id, trade_date);

do $$
declare t text;
begin
  foreach t in array array['ee_ema_positions','ee_ema_lots'] loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='authed all') then
      execute format('create policy "authed all" on %I for all to authenticated using (true) with check (true)', t);
    end if;
    begin execute format('alter publication supabase_realtime add table %I', t); exception when duplicate_object then null; end;
  end loop;
end $$;

notify pgrst, 'reload schema';
