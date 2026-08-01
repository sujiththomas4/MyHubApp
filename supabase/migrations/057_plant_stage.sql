-- Plantation — plant lifecycle stage (planned vs planted), separate from the
-- health status (healthy/defect/dead). Lets you add plants as "planned" before
-- they are actually planted, then flip to "planted" later.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_plants add column if not exists stage text not null default 'planted';

notify pgrst, 'reload schema';
