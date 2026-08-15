-- Key notes for the clean-trades challenge: free-form notes with an optional
-- screenshot, kept separate from individual trades.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists challenge_notes (
  id text primary key,
  body text,
  image text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table challenge_notes enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='challenge_notes' and policyname='authed all') then
    create policy "authed all" on challenge_notes for all to authenticated using (true) with check (true);
  end if;
  begin alter publication supabase_realtime add table challenge_notes; exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';
