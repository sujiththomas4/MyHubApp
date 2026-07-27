-- Plantation — plot structures (gate, shed, water tank, path…) drawn on the
-- Explorer "Plot" map alongside zones. Geometry is free-form x/y/w/h in plot
-- units (any scale, e.g. 0–100); the map scales the whole thing to fit.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_plot_features (
  id text primary key,
  land_id text not null,
  label text,
  kind text default 'other',    -- gate | shed | tank | path | other
  x numeric, y numeric, w numeric, h numeric,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_plot_features_land on plantation_plot_features (land_id);

alter table plantation_plot_features enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'plantation_plot_features' and policyname = 'authed all'
  ) then
    create policy "authed all" on plantation_plot_features for all to authenticated using (true) with check (true);
  end if;
  begin
    alter publication supabase_realtime add table plantation_plot_features;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
