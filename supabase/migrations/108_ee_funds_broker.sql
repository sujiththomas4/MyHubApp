-- Steady 25 SIP — record WHAT each holding actually is and WHERE it sits.
--
-- ee_funds.name is the slot ("Nifty 50 Index Fund"). fund_name is the real
-- scheme you bought into it ("UTI Nifty 50 Index Fund - Direct Growth"), and
-- broker_slug/broker_holder point at the capital account holding it, so the
-- same slot can be held at a different broker per household member.
--
-- broker_slug + broker_holder mirror the (slug, holder) key used by the
-- brokers table; holder is '' for single-holder brokers.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table ee_funds add column if not exists fund_name     text;
alter table ee_funds add column if not exists broker_slug   text;
alter table ee_funds add column if not exists broker_holder text;

notify pgrst, 'reload schema';
