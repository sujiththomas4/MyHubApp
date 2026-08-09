-- Contacts can be flagged as very important (pinned to the top with a star).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_contacts
  add column if not exists important boolean not null default false;

notify pgrst, 'reload schema';
