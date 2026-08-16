-- Eva & Ezaak — Nifty–Gold Ratio (Short Term) rotation strategy. A separate
-- copy of the business Nifty–Gold data, all short-term (rotation) lots.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists ee_ng_trades (
  id         text primary key,
  asset      text not null default 'nifty',   -- nifty | gold
  action     text not null default 'buy',      -- buy | sell
  parent_id  text,                             -- sell -> the buy lot it squares off
  qty        numeric,
  price      numeric,
  date       date,
  note       text,
  created_at timestamptz not null default now()
);

create table if not exists ee_ng_settings (
  id          text primary key,                -- single 'main' row
  nifty_price numeric,
  gold_price  numeric,
  updated_at  timestamptz
);

do $$
begin
  execute 'alter table ee_ng_trades enable row level security';
  execute 'alter table ee_ng_settings enable row level security';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_ng_trades' and policyname='authed all') then create policy "authed all" on ee_ng_trades for all to authenticated using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ee_ng_settings' and policyname='authed all') then create policy "authed all" on ee_ng_settings for all to authenticated using (true) with check (true); end if;
  begin alter publication supabase_realtime add table ee_ng_trades; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table ee_ng_settings; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
