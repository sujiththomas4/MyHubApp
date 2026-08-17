-- Swing 1 Hour — remember the amount deployed per trade.
--
-- Swing 50 sizes from risk (qty = risk budget / stop distance). Swing 1 Hour
-- sizes from capital instead: you say how much to put in, it works out the
-- quantity. The last amount used is kept here so the next trade prefills.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists swing1h_config (
  id            text primary key default 'main',
  deploy_amount numeric not null default 100000
);
insert into swing1h_config (id) values ('main') on conflict (id) do nothing;

alter table swing1h_config enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='swing1h_config' and policyname='authed all') then
    create policy "authed all" on swing1h_config for all to authenticated using (true) with check (true);
  end if;
  begin alter publication supabase_realtime add table swing1h_config; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
