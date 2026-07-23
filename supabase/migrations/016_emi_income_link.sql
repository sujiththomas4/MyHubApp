-- Money — link each EMI to the income source that funds it.
--
-- income_id references income_sources.id (kept nullable / unassigned allowed).
-- Lets the app show per-income coverage: does each source cover the EMIs paid
-- from it, and what's left.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table emis
  add column if not exists income_id text;

notify pgrst, 'reload schema';
