create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_type') then
    create type account_type as enum ('neighbor', 'merchant');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'business_plan') then
    create type business_plan as enum ('free', 'orders', 'plus');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_status') then
    create type plan_status as enum ('free', 'manual_pending', 'active', 'past_due', 'paused');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('user', 'admin');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_type account_type not null default 'neighbor',
  full_name text not null,
  whatsapp text,
  section text default 'Liceo Procrear',
  interests text,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  business_type text not null default 'local' check (business_type in ('local', 'entrepreneur')),
  has_public_address boolean not null default true,
  category text not null,
  section text not null,
  address text,
  reference text,
  location_mode text not null default 'address' check (location_mode in ('address', 'pin', 'none')),
  location_lat numeric(10, 6),
  location_lng numeric(10, 6),
  location_precision text not null default 'approximate' check (location_precision in ('exact', 'approximate')),
  location_note text,
  hours text,
  open_days text[] not null default array['Lun','Mar','Mie','Jue','Vie','Sab'],
  open_time text,
  close_time text,
  whatsapp text,
  instagram text,
  description text,
  payment_methods text,
  delivery_label text,
  delivery_zone text,
  has_delivery boolean not null default false,
  order_hours text,
  image_key text not null default 'generic',
  image_zoom integer not null default 120,
  image_position text not null default 'center center',
  tone text not null default 'orange',
  plan business_plan not null default 'free',
  plan_status plan_status not null default 'free',
  paid_until date,
  admin_notes text,
  is_public boolean not null default true,
  is_open boolean not null default true,
  verified boolean not null default false,
  rating numeric(2, 1),
  followers_count integer not null default 0,
  distance_label text default 'cerca',
  search_text text generated always as (
    lower(coalesce(name, '') || ' ' || coalesce(category, '') || ' ' || coalesce(section, '') || ' ' || coalesce(address, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

alter table if exists public.businesses
  add column if not exists business_type text not null default 'local',
  add column if not exists has_public_address boolean not null default true,
  add column if not exists location_mode text not null default 'address',
  add column if not exists location_lat numeric(10, 6),
  add column if not exists location_lng numeric(10, 6),
  add column if not exists location_precision text not null default 'approximate',
  add column if not exists location_note text,
  add column if not exists open_days text[] not null default array['Lun','Mar','Mie','Jue','Vie','Sab'],
  add column if not exists open_time text,
  add column if not exists close_time text,
  add column if not exists image_zoom integer not null default 120,
  add column if not exists image_position text not null default 'center center',
  add column if not exists plan_status plan_status not null default 'free',
  add column if not exists paid_until date,
  add column if not exists admin_notes text;

alter table if exists public.businesses
  drop constraint if exists businesses_location_mode_check;

alter table if exists public.businesses
  add constraint businesses_location_mode_check
  check (location_mode in ('address', 'pin', 'none'));

alter table if exists public.businesses
  drop constraint if exists businesses_location_precision_check;

alter table if exists public.businesses
  add constraint businesses_location_precision_check
  check (location_precision in ('exact', 'approximate'));

alter table if exists public.profiles
  add column if not exists role user_role not null default 'user';

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2),
  image_key text,
  is_available boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  description text,
  category text,
  section text,
  price numeric(12, 2),
  price_label text,
  image_key text,
  tone text,
  highlight text,
  saves_count integer not null default 0,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '4 days',
  is_active boolean not null default true,
  search_text text generated always as (
    lower(coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '') || ' ' || coalesce(section, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace view public.active_offers
with (security_invoker = true) as
select
  o.*,
  case
    when o.expires_at <= now() + interval '1 day' then 'vence hoy'
    when o.expires_at <= now() + interval '2 days' then '2 dias'
    when o.expires_at <= now() + interval '3 days' then '3 dias'
    else '4 dias'
  end as expires_label
from public.offers o
where o.is_active = true
  and o.starts_at <= now()
  and o.expires_at > now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-photos',
  'business-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "business photos public read" on storage.objects;
create policy "business photos public read"
on storage.objects for select
to public
using (bucket_id = 'business-photos');

drop policy if exists "business photos owner upload" on storage.objects;
drop policy if exists "business photos authenticated upload" on storage.objects;
create policy "business photos authenticated upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'business-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or owner = (select auth.uid())
  )
);

drop policy if exists "business photos owner update" on storage.objects;
create policy "business photos owner update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'business-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or owner = (select auth.uid())
  )
)
with check (
  bucket_id = 'business-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or owner = (select auth.uid())
  )
);

drop policy if exists "business photos owner delete" on storage.objects;
create policy "business photos owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'business-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or owner = (select auth.uid())
  )
);

create index if not exists businesses_public_idx on public.businesses (is_public, section, category, is_open);
create index if not exists businesses_owner_idx on public.businesses (owner_id);
create index if not exists businesses_search_idx on public.businesses using gin (to_tsvector('spanish', search_text));
create index if not exists products_business_idx on public.products (business_id, position);
create index if not exists offers_active_idx on public.offers (is_active, expires_at desc, business_id);
create index if not exists offers_filter_idx on public.offers (section, category, expires_at desc);
create index if not exists offers_search_idx on public.offers using gin (to_tsvector('spanish', search_text));

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "businesses public read" on public.businesses;
create policy "businesses public read"
on public.businesses for select
using (is_public = true or auth.uid() = owner_id);

drop policy if exists "businesses admin read" on public.businesses;
create policy "businesses admin read"
on public.businesses for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "businesses merchant insert own" on public.businesses;
create policy "businesses merchant insert own"
on public.businesses for insert
with check (auth.uid() = owner_id);

drop policy if exists "businesses merchant update own" on public.businesses;
create policy "businesses merchant update own"
on public.businesses for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "businesses admin update" on public.businesses;
create policy "businesses admin update"
on public.businesses for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "businesses admin delete" on public.businesses;
create policy "businesses admin delete"
on public.businesses for delete
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "products public read" on public.products;
create policy "products public read"
on public.products for select
using (
  exists (
    select 1 from public.businesses b
    where b.id = products.business_id
      and (b.is_public = true or b.owner_id = auth.uid())
  )
);

drop policy if exists "products merchant write own" on public.products;
create policy "products merchant write own"
on public.products for all
using (
  exists (
    select 1 from public.businesses b
    where b.id = products.business_id
      and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = products.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists "products admin manage" on public.products;
create policy "products admin manage"
on public.products for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "offers public active read" on public.offers;
create policy "offers public active read"
on public.offers for select
using (
  (is_active = true and starts_at <= now() and expires_at > now())
  or exists (
    select 1 from public.businesses b
    where b.id = offers.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists "offers admin manage" on public.offers;
create policy "offers admin manage"
on public.offers for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "offers merchant write own" on public.offers;
create policy "offers merchant write own"
on public.offers for all
using (
  exists (
    select 1 from public.businesses b
    where b.id = offers.business_id
      and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = offers.business_id
      and b.owner_id = auth.uid()
  )
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role and old.role <> 'admin' then
    raise exception 'No se puede cambiar el rol desde la cuenta de usuario.';
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    account_type,
    full_name,
    whatsapp,
    section,
    interests
  )
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'account_type')::account_type, 'neighbor'),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'whatsapp',
    coalesce(new.raw_user_meta_data ->> 'section', 'Liceo Procrear'),
    new.raw_user_meta_data ->> 'interests'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_profile_role_escalation();

drop trigger if exists businesses_touch_updated_at on public.businesses;
create trigger businesses_touch_updated_at
before update on public.businesses
for each row execute function public.touch_updated_at();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists offers_touch_updated_at on public.offers;
create trigger offers_touch_updated_at
before update on public.offers
for each row execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
