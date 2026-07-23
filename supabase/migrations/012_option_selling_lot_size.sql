-- Daily Option Selling backtests — per-backtest lot size.
--
-- Rupee premium / P&L = points × lots × lot_size. Lots live per-leg inside the
-- legs jsonb (no migration needed for those); lot_size is one value per
-- backtest (usually one instrument), so it gets its own column.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table option_selling_backtests
  add column if not exists lot_size numeric default 65;

notify pgrst, 'reload schema';
