-- Plantation — planned-crop children: multiple reference links and multiple
-- points of contact per crop (replaces the single youtube/contacts text fields).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists plantation_crop_links (
  id text primary key,
  crop_id text not null,
  title text,
  url text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists plantation_crop_contacts (
  id text primary key,
  crop_id text not null,
  name text,
  phone text,
  expertise text,               -- what they grow / their experience
  note text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_crop_links_crop on plantation_crop_links (crop_id);
create index if not exists idx_crop_contacts_crop on plantation_crop_contacts (crop_id);

do $$
declare t text;
begin
  foreach t in array array['plantation_crop_links','plantation_crop_contacts'] loop
    execute format('alter table %I enable row level security;', t);
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'authed all'
    ) then
      execute format($p$create policy "authed all" on %I for all to authenticated using (true) with check (true);$p$, t);
    end if;
    begin
      execute format('alter publication supabase_realtime add table %I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

notify pgrst, 'reload schema';
