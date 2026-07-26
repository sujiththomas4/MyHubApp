-- Pepper bookings — nursery (was customer) + address, assigned person, actions.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'plantation_pepper_bookings' and column_name = 'customer')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'plantation_pepper_bookings' and column_name = 'nursery') then
    alter table plantation_pepper_bookings rename column customer to nursery;
  end if;
end $$;

alter table plantation_pepper_bookings
  add column if not exists address text,
  add column if not exists assigned text,   -- assigned person (from profiles)
  add column if not exists actions text;    -- action to be done

notify pgrst, 'reload schema';
