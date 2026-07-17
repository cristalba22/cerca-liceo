-- Cerca Liceo - feed publico seguro sin exponer columnas internas.
-- Evita dar SELECT completo sobre businesses, especialmente admin_notes.

create or replace function public.public_list_offers(
  p_section text default 'Todos',
  p_category text default 'Todas',
  p_query text default '',
  p_limit integer default 50
)
returns table (
  id uuid,
  business_id uuid,
  title text,
  description text,
  category text,
  section text,
  price numeric,
  price_label text,
  image_key text,
  tone text,
  highlight text,
  saves_count integer,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean,
  created_at timestamptz,
  business_name text,
  business_type text,
  has_public_address boolean,
  address text,
  reference text,
  location_mode text,
  location_lat numeric,
  location_lng numeric,
  location_precision text,
  location_note text,
  hours text,
  open_days text[],
  open_time text,
  close_time text,
  whatsapp text,
  instagram text,
  business_tone text,
  business_image_key text,
  is_open boolean,
  distance_label text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    o.business_id,
    o.title,
    o.description,
    o.category,
    o.section,
    o.price,
    o.price_label,
    o.image_key,
    o.tone,
    o.highlight,
    o.saves_count,
    o.starts_at,
    o.expires_at,
    o.is_active,
    o.created_at,
    b.name as business_name,
    b.business_type,
    b.has_public_address,
    b.address,
    b.reference,
    b.location_mode,
    b.location_lat,
    b.location_lng,
    b.location_precision,
    b.location_note,
    b.hours,
    b.open_days,
    b.open_time,
    b.close_time,
    b.whatsapp,
    b.instagram,
    b.tone as business_tone,
    b.image_key as business_image_key,
    b.is_open,
    b.distance_label
  from public.offers o
  join public.businesses b on b.id = o.business_id
  where o.is_active = true
    and o.starts_at <= now()
    and o.expires_at > now()
    and b.is_public = true
    and (p_section = 'Todos' or o.section = p_section)
    and (p_category = 'Todas' or o.category = p_category)
    and (
      coalesce(trim(p_query), '') = ''
      or o.search_text ilike ('%' || trim(p_query) || '%')
      or b.search_text ilike ('%' || trim(p_query) || '%')
    )
  order by o.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 80));
$$;

grant execute on function public.public_list_offers(text, text, text, integer) to anon, authenticated;

create or replace function public.public_list_products(
  p_business_ids uuid[]
)
returns table (
  id uuid,
  business_id uuid,
  name text,
  price numeric,
  is_available boolean,
  product_position integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.business_id,
    p.name,
    p.price,
    p.is_available,
    p.position as product_position
  from public.products p
  join public.businesses b on b.id = p.business_id
  where p.is_available = true
    and b.is_public = true
    and b.plan = 'orders'
    and b.plan_status = 'active'
    and (b.paid_until is null or b.paid_until >= current_date)
    and p.business_id = any(coalesce(p_business_ids, array[]::uuid[]))
  order by p.business_id, p.position asc;
$$;

grant execute on function public.public_list_products(uuid[]) to anon, authenticated;
