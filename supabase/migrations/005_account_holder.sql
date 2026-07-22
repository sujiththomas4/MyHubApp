-- Account holder name across brokers + accounts, so the same broker can be
-- held under two names (e.g. two Zerodha accounts, different holders).
--
-- brokers: capital is now per (broker, holder), so the primary key becomes the
-- pair. broker_accounts / stock_accounts just gain a holder column.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

-- ---- brokers: capital per (slug, holder) ----------------------------------
alter table brokers add column if not exists holder text not null default '';

-- Repoint the primary key to (slug, holder) only if it isn't already. Compare
-- the current PK column set to {slug,holder}; attname is type `name`, so cast
-- to text before comparing with a text[] literal.
do $$
declare
  pk_cols text[];
begin
  select coalesce(array_agg(a.attname::text order by a.attname), array[]::text[])
    into pk_cols
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
   where c.conrelid = 'brokers'::regclass and c.contype = 'p';

  if pk_cols is distinct from array['holder','slug'] then
    alter table brokers drop constraint if exists brokers_pkey;
    alter table brokers add constraint brokers_pkey primary key (slug, holder);
  end if;
end $$;

-- ---- per-account holder ----------------------------------------------------
alter table broker_accounts add column if not exists holder text not null default '';
alter table stock_accounts  add column if not exists holder text not null default '';

notify pgrst, 'reload schema';
