-- Key notes can carry tags (key takeaways) for quick scanning / searching.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table challenge_notes
  add column if not exists tags jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
