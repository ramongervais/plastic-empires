-- Hammer & Mold - admin console schema
--
-- Run once in Supabase: Dashboard > SQL Editor > New query > Run.
-- Every statement is guarded, so it is safe to re-run.
-- Read it before running: it touches RLS on a live database.

-- ---------------------------------------------------------------------------
-- 1. Admin flag
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Helper so policies stay readable. security definer lets it read profiles
-- even while profiles' own RLS is being evaluated.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Admins can read and edit every profile (the Sellers section needs this).
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Paid featured placements
-- ---------------------------------------------------------------------------
create table if not exists public.featured_placements (
  id          uuid primary key default gen_random_uuid(),
  lot_id      uuid not null references public.lots(id) on delete cascade,
  seller_id   uuid references public.profiles(id) on delete set null,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  amount_eur  numeric(10,2) not null default 0,
  status      text not null default 'unpaid'
              check (status in ('unpaid', 'paid', 'refunded')),
  rank        integer not null default 0,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists featured_placements_lot_idx
  on public.featured_placements (lot_id);
create index if not exists featured_placements_window_idx
  on public.featured_placements (starts_at, ends_at);

alter table public.featured_placements enable row level security;

-- These rows carry money and payment status, so they are admin-only.
drop policy if exists featured_placements_admin_all on public.featured_placements;
create policy featured_placements_admin_all on public.featured_placements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. What the public shop may see
-- ---------------------------------------------------------------------------
-- Only which lots are promoted and in what order. No amounts, no payment
-- status. security_invoker = false means the view runs as its owner, so it can
-- expose this narrow slice without opening up the table behind it.
--
-- A placement shows while its window is open and it has not been refunded,
-- so an invoice that is still unpaid does not stall the promotion. To require
-- payment up front instead, change `status <> 'refunded'` to `status = 'paid'`.
create or replace view public.featured_active
  with (security_invoker = false) as
  select lot_id, rank
  from public.featured_placements
  where status <> 'refunded'
    and starts_at <= now()
    and (ends_at is null or ends_at >= now());

grant select on public.featured_active to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Site settings (key/value, for whatever comes next)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  key        text primary key,
  value      jsonb,
  label      text,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

-- Everyone may read settings so the public site can act on them.
drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings
  for select to anon, authenticated
  using (true);

-- Only admins may write them.
drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;
grant select, insert, update, delete on public.featured_placements to authenticated;

-- ---------------------------------------------------------------------------
-- 4b. Sellers section, without granting anything on profiles
-- ---------------------------------------------------------------------------
-- The authenticated role has no SELECT or UPDATE grant on public.profiles, and
-- granting them would be unsafe: the existing "profiles update own" policy
-- (using auth.uid() = id) puts no restriction on which columns a user may
-- change, and is_admin is one of them. Granting UPDATE would therefore let any
-- signed-in user promote themselves to admin.
--
-- These functions are security definer, so they run as their owner and need no
-- table grant. Each one checks is_admin() itself, so a non-admin gets an empty
-- list or an exception.

create or replace function public.admin_list_sellers()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(r), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id',           p.id,
      'display_name', p.display_name,
      'handle',       p.handle,
      'type',         p.type,
      'location',     p.location,
      'plan',         p.plan,
      'tokens',       p.tokens,
      'created_at',   p.created_at,
      'lots', (select count(*) from public.lots l
                where l.seller_id = p.id and l.status <> 'draft')
    ) as r
    from public.profiles p
    where public.is_admin()
    order by p.created_at desc
  ) s;
$$;

create or replace function public.admin_set_plan(target uuid, new_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;
  if new_plan not in ('starter', 'premium') then
    raise exception 'plan must be starter or premium';
  end if;
  update public.profiles set plan = new_plan where id = target;
end;
$$;

create or replace function public.admin_set_tokens(target uuid, new_tokens integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;
  if new_tokens < 0 then
    raise exception 'tokens must be zero or more';
  end if;
  update public.profiles set tokens = new_tokens where id = target;
end;
$$;

revoke execute on function public.admin_list_sellers() from anon;
revoke execute on function public.admin_set_plan(uuid, text) from anon;
revoke execute on function public.admin_set_tokens(uuid, integer) from anon;
grant execute on function public.admin_list_sellers() to authenticated;
grant execute on function public.admin_set_plan(uuid, text) to authenticated;
grant execute on function public.admin_set_tokens(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 4c. Close the is_admin escalation route (recommended, independent of the console)
-- ---------------------------------------------------------------------------
-- Right now nothing can reach is_admin over the API because the UPDATE grant is
-- missing. That is luck, not a control: the day anyone grants UPDATE on
-- profiles, "profiles update own" lets every user flip their own is_admin.
-- This trigger makes the column safe regardless of grants.
--
-- auth.uid() is null in the SQL editor and for service_role, so those can still
-- manage admins. Only ordinary API callers are blocked.
create or replace function public.guard_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'is_admin cannot be changed by this account';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_is_admin on public.profiles;
create trigger profiles_guard_is_admin
  before update on public.profiles
  for each row execute function public.guard_is_admin();

-- ---------------------------------------------------------------------------
-- 4d. Public seller profiles (fixes the public site, not the console)
-- ---------------------------------------------------------------------------
-- The "profiles read" policy was SELECT / public / using (true), meaning seller
-- profiles were meant to be world-readable. But no role held a SELECT grant on
-- the table, so the policy could never fire and the public seller pages plus
-- the account page were failing silently.
--
-- Granting select on the table would have honoured that policy and published
-- every seller's plan, token balance and notification settings. Instead the
-- public gets a view with only the public columns, and the table itself is
-- narrowed to own-row reads.

create or replace view public.seller_public
  with (security_invoker = false) as
  select id, display_name, handle, type, location, bio, created_at
  from public.profiles;

grant select on public.seller_public to anon, authenticated;

-- A signed-in user reads only their own row now. Public seller data comes from
-- seller_public above; admins still see everything via profiles_admin_all.
drop policy if exists "profiles read" on public.profiles;
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

-- Safe now that 4c guards is_admin: "profiles update own" lets a user edit
-- their own row, and the trigger stops that reaching is_admin.
grant select, update on public.profiles to authenticated;

-- Optional hygiene, not required: anon holds INSERT and DELETE on profiles.
-- RLS blocks both today (verified), but the grants are pointless for an
-- unauthenticated visitor. Check first how a profile row gets created on
-- signup, since revoking the wrong one would break registration.
--   revoke insert, delete on public.profiles from anon;

-- ---------------------------------------------------------------------------
-- 6. Saved drafts (sell flow)
-- ---------------------------------------------------------------------------
-- A curation that has not been published yet. Deliberately its OWN table
-- rather than a lots row with status='draft', for two reasons:
--   1. consume_token() fires BEFORE INSERT on lots, so a draft row there would
--      spend a listing token immediately and another one on publish. Keeping
--      drafts out of lots means that trigger stays exactly as it is, and the
--      token is charged once, at publish, as it always was.
--   2. Nothing can leak into the shop by forgetting a status filter.
--
-- id becomes the lot id when published, so photos upload once to their final
-- path (uid/<id>/n.jpg) and the URLs stay valid afterwards.

create table if not exists public.lot_drafts (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references auth.users(id) on delete cascade,
  payload     jsonb not null default '{}'::jsonb,
  image_urls  text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists lot_drafts_seller_idx on public.lot_drafts (seller_id, updated_at desc);

alter table public.lot_drafts enable row level security;

-- Strictly your own drafts, read and write.
drop policy if exists lot_drafts_own on public.lot_drafts;
create policy lot_drafts_own on public.lot_drafts
  for all to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

grant select, insert, update, delete on public.lot_drafts to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Make yourself an admin
-- ---------------------------------------------------------------------------
-- Run this last, with your own address. Without it the console will sign you
-- in and then refuse access, which is the intended behaviour.
--
--   update public.profiles p
--      set is_admin = true
--     from auth.users u
--    where u.id = p.id
--      and u.email = 'you@example.com';
--
-- Check it took:
--   select p.id, u.email, p.is_admin
--     from public.profiles p join auth.users u on u.id = p.id
--    where p.is_admin;
