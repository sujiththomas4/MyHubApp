-- Strategies become flexible: each strategy defines its OWN columns instead of a
-- fixed schema. col_defs holds the column definitions, col_values holds this
-- strategy's value for each column.
--
--   col_defs   : [{ "id": "...", "name": "Entry", "type": "text|select", "options": ["a","b"] }]
--   col_values : { "<col id>": "value", ... }
--
-- The old fixed columns (entry_conditions, etc.) are left in place but unused.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table trading_strategies
  add column if not exists col_defs   jsonb not null default '[]'::jsonb,
  add column if not exists col_values jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
