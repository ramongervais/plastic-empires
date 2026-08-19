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
