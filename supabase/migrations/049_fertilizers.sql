-- Plantation — fertilizer / input reference library. What each fertilizer does,
-- pros/cons, when to use and when not to, its purpose (growth vs fixing defects),
-- plus an optional referral contact.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_fertilizers (
  id text primary key,
  name text not null,
  purpose text,                 -- growth | defect | pest | soil | general | other
  what_it_does text,
  pros text,
  cons text,
  when_use text,
  when_not_use text,
  dosage text,
  referral_name text,
  referral_phone text,
  note text,
  image text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table plantation_fertilizers enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'plantation_fertilizers' and policyname = 'authed all'
  ) then
    create policy "authed all" on plantation_fertilizers for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table plantation_fertilizers;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
