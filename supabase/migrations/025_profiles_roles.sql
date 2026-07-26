-- Users & roles.
--
-- Two roles: 'admin' (all sections) and 'plantation_member' (Plantation only).
-- Users are created in the Supabase dashboard; a trigger auto-creates their
-- profile row (default 'plantation_member'). An admin re-assigns roles from the
-- in-app Users & Roles screen. Section access is enforced in the UI; profile
-- roles themselves are protected by RLS (members can't promote themselves).
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'plantation_member',   -- 'admin' | 'plantation_member'
  created_at timestamptz not null default now()
);

-- Read the caller's role without tripping RLS recursion (SECURITY DEFINER
-- bypasses RLS for the lookup inside the function).
create or replace function public.my_role() returns text
language sql security definer stable set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table profiles enable row level security;

drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles for select to authenticated
  using (id = auth.uid() or public.my_role() = 'admin');

-- Only admins may change roles; there is no self-update policy, so a member
-- cannot edit their own row (and thus cannot promote themselves).
drop policy if exists "profiles admin update" on profiles;
create policy "profiles admin update" on profiles for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists "profiles admin insert" on profiles;
create policy "profiles admin insert" on profiles for insert to authenticated
  with check (public.my_role() = 'admin');

-- Auto-create a profile whenever an auth user is created (dashboard or signup).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'plantation_member')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any existing users, then make the owner an admin.
insert into public.profiles (id, email, role)
select id, email, 'plantation_member' from auth.users
on conflict (id) do nothing;

update public.profiles set role = 'admin' where email = 'sujiththomas4@gmail.com';

-- Realtime so a role change reflects without a reload.
do $$ begin alter publication supabase_realtime add table profiles; exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
