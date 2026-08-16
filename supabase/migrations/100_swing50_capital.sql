-- Swing 50 — set the trading capital to ₹12,00,000.
--
-- Everything else derives from it:
--   deployed cap  = 12,00,000 × 50%  = ₹6,00,000
--   risk / trade  = 6,00,000  × 1%   = ₹6,000
--   gold sleeve   = 6,00,000  × 10%  = ₹60,000
--   swing deployable (cap − sleeve)  = ₹5,40,000
-- (max_position_value stays ₹80,000 — an absolute per-position cap.)
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

insert into swing50_config (id, total_capital) values ('main', 1200000)
on conflict (id) do update set total_capital = 1200000;

notify pgrst, 'reload schema';
