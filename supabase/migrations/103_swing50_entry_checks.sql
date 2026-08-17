-- Swing 50 — entry confirmation checklist, recorded at OPEN time.
--
-- Planning is deliberately loose: when a trade is planned the setup has not
-- triggered yet, so volume, the reclaim candle and the trend state cannot be
-- answered honestly. Those questions are asked when money actually moves.
--
-- setup_type   PULLBACK | BREAKOUT — decides which checks are asked.
-- entry_checks {key: true} — what was confirmed, kept so the journal can later
--              correlate skipped discipline against outcome.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table swing50_trades add column if not exists setup_type   text;
alter table swing50_trades add column if not exists entry_checks jsonb;

alter table swing50_config add column if not exists min_position_value numeric not null default 25000;

notify pgrst, 'reload schema';
