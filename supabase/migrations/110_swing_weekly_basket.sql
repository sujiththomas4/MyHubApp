-- Swing Weekly — basket entry, and a stop that is genuinely optional.
--
-- The weekly ritual is: pick N stocks, split a fixed amount equally, note the
-- entry price. A stop is useful but not always decided at that moment, so
-- stop_price becomes nullable. NULL now means "no stop set" — distinct from 0,
-- which used to make risk equal the whole entry price and quietly turned every
-- R multiple into nonsense.
--
-- Default deployment moves to 200000, the weekly basket size.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table swing1h_trades alter column stop_price drop not null;

-- 0 was the old "unset" marker; NULL says it properly.
update swing1h_trades set stop_price = null where stop_price = 0;

alter table swing1h_config alter column deploy_amount set default 200000;
update swing1h_config set deploy_amount = 200000
  where id = 'main' and deploy_amount = 100000;

notify pgrst, 'reload schema';
