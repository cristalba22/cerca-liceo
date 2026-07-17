-- Cerca Liceo - ubicacion por pin opcional para comercios.
-- Ejecutar en Supabase SQL Editor. No borra datos existentes.

alter table public.businesses
  add column if not exists location_mode text not null default 'address',
  add column if not exists location_lat numeric(10, 6),
  add column if not exists location_lng numeric(10, 6),
  add column if not exists location_precision text not null default 'approximate',
  add column if not exists location_note text;

alter table public.businesses
  drop constraint if exists businesses_location_mode_check;

alter table public.businesses
  add constraint businesses_location_mode_check
  check (location_mode in ('address', 'pin', 'none'));

alter table public.businesses
  drop constraint if exists businesses_location_precision_check;

alter table public.businesses
  add constraint businesses_location_precision_check
  check (location_precision in ('exact', 'approximate'));

update public.businesses
set location_mode = case
  when business_type = 'entrepreneur' then 'none'
  when has_public_address = false then 'none'
  else coalesce(nullif(location_mode, ''), 'address')
end
where location_mode is null
   or location_mode = ''
   or (business_type = 'entrepreneur' and location_mode <> 'none');

-- Mantener admin_notes privado, pero permitir leer el pin publico.
revoke select on table public.businesses from anon, authenticated;

grant select (
  id,
  name,
  business_type,
  has_public_address,
  category,
  section,
  address,
  reference,
  location_mode,
  location_lat,
  location_lng,
  location_precision,
  location_note,
  hours,
  open_days,
  open_time,
  close_time,
  whatsapp,
  instagram,
  description,
  payment_methods,
  delivery_label,
  delivery_zone,
  has_delivery,
  order_hours,
  image_key,
  image_zoom,
  image_position,
  tone,
  plan,
  plan_status,
  paid_until,
  is_public,
  is_open,
  verified,
  rating,
  followers_count,
  distance_label,
  search_text,
  created_at,
  updated_at
) on public.businesses to anon;

grant select (
  id,
  owner_id,
  name,
  business_type,
  has_public_address,
  category,
  section,
  address,
  reference,
  location_mode,
  location_lat,
  location_lng,
  location_precision,
  location_note,
  hours,
  open_days,
  open_time,
  close_time,
  whatsapp,
  instagram,
  description,
  payment_methods,
  delivery_label,
  delivery_zone,
  has_delivery,
  order_hours,
  image_key,
  image_zoom,
  image_position,
  tone,
  plan,
  plan_status,
  paid_until,
  is_public,
  is_open,
  verified,
  rating,
  followers_count,
  distance_label,
  search_text,
  created_at,
  updated_at
) on public.businesses to authenticated;
