-- Daily trade review: which of the defined mistakes were actually committed
-- on a given day. Powers the "How did I trade today?" panel and its history.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run.
-- Safe to re-run.

create table if not exists daily_reviews (
  date date primary key,
  mistakes jsonb not null default '[]'::jsonb,  -- mistake ids from dailyReview.js
  note text,
  updated_at timestamptz not null default now()
);

-- RLS: same "any authenticated user" policy the other tables use.
alter table daily_reviews enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_reviews' and policyname = 'authed all'
  ) then
    create policy "authed all" on daily_reviews
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Realtime, so a review saved on one device shows up on the others.
-- Wrapped: adding a table already in the publication raises an error.
do $$
begin
  alter publication supabase_realtime add table daily_reviews;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
