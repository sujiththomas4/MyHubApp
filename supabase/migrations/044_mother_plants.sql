-- Plant Factory — designate which plants are mother plants. Previously every
-- plant in the hierarchy was implicitly usable as a parent; now mothers are
-- chosen explicitly in the Mother Plants tab and only they appear in the batch
-- parent-plant picker.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table plantation_plants add column if not exists is_mother boolean not null default false;

notify pgrst, 'reload schema';
