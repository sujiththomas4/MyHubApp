-- 50 & 200 EMA Support — record WHICH support each buy was made at.
--
-- Lives on the lot, not the position: one stock can be added at the 50 EMA in
-- March and at the 200 in October, and the whole point of the book is to find
-- out which of those actually worked.
--
-- '50' | '200' | null (bought somewhere else, or not noted).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table ee_ema_lots add column if not exists support text;

notify pgrst, 'reload schema';
