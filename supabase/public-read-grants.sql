-- Permisos publicos minimos para que visitantes puedan ver home, guia, promos y mini carta.
-- RLS sigue activo: estas grants solo permiten que las policies decidan que filas se ven.
-- Importante: no usar `grant select on table public.businesses`, porque expondria admin_notes.

grant usage on schema public to anon, authenticated;

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

grant select on table public.offers to anon, authenticated;
grant select on table public.products to anon, authenticated;

do $$
begin
  if to_regclass('public.active_offers') is not null then
    grant select on table public.active_offers to anon, authenticated;
  end if;
end $$;
