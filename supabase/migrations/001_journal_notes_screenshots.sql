-- Adds the named screenshots to journal observations.
-- Run once in: Supabase -> SQL Editor -> New query -> Run.
--
-- Observations capture five shots (Nifty 50, Nifty Future, OI change, VIX, and
-- the marked-up plan). They're stored as { name: storageUrl } in one jsonb
-- column rather than five text columns, so adding a sixth needs no migration.
--
-- Safe to re-run.

alter table journal_notes
  add column if not exists screenshots jsonb not null default '{}'::jsonb;

-- PostgREST caches the schema; the app talks to it, not to Postgres directly.
-- Supabase normally reloads automatically, but this forces it so you don't have
-- to wait for "Could not find the 'screenshots' column ... in the schema cache"
-- to clear.
notify pgrst, 'reload schema';
