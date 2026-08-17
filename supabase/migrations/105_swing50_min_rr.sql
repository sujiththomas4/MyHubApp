-- Swing 50 — lower the reward:risk floor from 2.0 to 1.5.
--
-- At 2.0 the gate was blocking almost every base breakout: with a 2x ATR stop
-- and a measured-move target, R:R is roughly base_height / (2 x ATR), so a
-- base has to be 4+ ATRs tall to clear 2.0 — and most run 3-4. At 1.5 a base
-- of ~3 ATRs qualifies, which puts breakouts back in play alongside pullbacks.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table swing50_config alter column min_rr set default 1.5;
update swing50_config set min_rr = 1.5 where id = 'main';

notify pgrst, 'reload schema';
