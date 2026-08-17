-- Swing 50 — ATR-validated stops and a hard reward:risk floor.
--
-- ATR(14) is recorded on the trade so the journal can answer "was my stop
-- inside the noise?" after the fact, not just at entry time. The 1.5x-3.0x
-- band and the R:R floor are config so they can be tuned without a deploy.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table swing50_trades add column if not exists atr numeric;

alter table swing50_config add column if not exists min_rr        numeric not null default 2.0;
alter table swing50_config add column if not exists atr_mult_min  numeric not null default 1.5;
alter table swing50_config add column if not exists atr_mult_max  numeric not null default 3.0;

notify pgrst, 'reload schema';
