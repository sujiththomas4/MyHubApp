-- Stock Strength — the master LTP.
--
-- LTP was scattered: swing1h_trades.ltp, ee_ema_positions.ltp,
-- ee_focus_stocks.ltp, each maintained by its own screen. This makes
-- stock_strength the one place a price is known, and every screen that edits
-- an LTP now writes it back here, keyed on symbol.
--
-- Updating LTP on Stock Strength also pushes down into the books, so one
-- update keeps every screen in agreement.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table stock_strength add column if not exists ltp            numeric;
alter table stock_strength add column if not exists ltp_updated_at timestamptz;

notify pgrst, 'reload schema';
