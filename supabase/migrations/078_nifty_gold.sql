-- Nifty–Gold Ratio investment: rotate/accumulate between Nifty and Gold based on
-- an indication. Trades log buys/sells per asset; settings hold the latest unit
-- prices (used for the ratio, the quantity calculator and valuations).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists ng_trades (
  id text primary key,
  asset text not null default 'nifty',   -- nifty | gold
  action text not null default 'buy',    -- buy | sell
  qty numeric,
  price numeric,
  date date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists ng_settings (
  id text primary key,
  nifty_price numeric,
  gold_price numeric,
  updated_at timestamptz not null default now()
);

do $$
begin
  execute 'alter table ng_trades enable row level security';
  execute 'alter table ng_settings enable row level security';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ng_trades' and policyname='authed all') then
    create policy "authed all" on ng_trades for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ng_settings' and policyname='authed all') then
    create policy "authed all" on ng_settings for all to authenticated using (true) with check (true);
  end if;
  begin alter publication supabase_realtime add table ng_trades; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table ng_settings; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
