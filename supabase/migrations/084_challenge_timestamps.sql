-- Timestamps to auto-evaluate the "planned ahead of execution" rule: created_at
-- (when the trade was planned) and activated_at (when it was marked active).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table challenge_trades
  add column if not exists created_at timestamptz default now(),
  add column if not exists activated_at timestamptz;

notify pgrst, 'reload schema';
