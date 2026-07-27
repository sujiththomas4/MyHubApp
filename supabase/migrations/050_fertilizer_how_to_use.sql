-- Plantation — add a "How to use" field to the fertilizer reference library
-- (application method / steps, distinct from dosage and when-to-use).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_fertilizers add column if not exists how_to_use text;

notify pgrst, 'reload schema';
