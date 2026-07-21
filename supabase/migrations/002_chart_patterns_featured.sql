-- Marks a chart pattern as "check this every day", so it shows up in the
-- Patterns to review section on the Before I Trade screen.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run.
-- Safe to re-run.

alter table chart_patterns
  add column if not exists featured boolean not null default false;

-- PostgREST caches the table shape; force a reload so the app sees the column
-- immediately instead of erroring with "could not find the 'featured' column".
notify pgrst, 'reload schema';
