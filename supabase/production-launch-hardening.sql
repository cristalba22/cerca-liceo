-- Cerca Liceo - ajustes antes de difundir.
-- Ejecutar en Supabase SQL Editor una vez revisado.

-- 1) Tracking real de visitas y acciones.
create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('page_view', 'business_view', 'offer_view', 'whatsapp_click', 'favorite_click')),
  business_id uuid references public.businesses(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.app_events enable row level security;

drop policy if exists "app_events_insert_public" on public.app_events;
create policy "app_events_insert_public"
on public.app_events
for insert
to anon, authenticated
with check (true);

drop policy if exists "app_events_select_admin" on public.app_events;
create policy "app_events_select_admin"
on public.app_events
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create index if not exists app_events_created_at_idx on public.app_events(created_at desc);
create index if not exists app_events_business_id_idx on public.app_events(business_id);
create index if not exists app_events_event_type_idx on public.app_events(event_type);

-- 2) Evitar que usuarios anonimos lean campos internos de negocios.
-- El frontend ya pide columnas publicas, esto refuerza la base.
revoke select on public.businesses from anon;
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
  tone,
  image_key,
  image_zoom,
  image_position,
  is_open,
  rating,
  followers_count,
  verified,
  delivery_label,
  has_delivery,
  order_hours,
  delivery_zone,
  distance_label,
  plan,
  plan_status,
  paid_until,
  is_public,
  search_text,
  updated_at
) on public.businesses to anon;

-- 3) Reglas publicas basicas.
drop policy if exists "businesses_public_read" on public.businesses;
create policy "businesses_public_read"
on public.businesses
for select
to anon
using (is_public = true);

-- 4) Limpieza de datos QA obvios. No toca Mr. Food ni comercios reales.
delete from public.offers
where business_id in (
  select id from public.businesses
  where name ilike 'QA %'
     or name ilike '%testing%'
)
or title ilike '%QA testing%'
or title ilike '%178386%';

delete from public.products
where business_id in (
  select id from public.businesses
  where name ilike 'QA %'
     or name ilike '%testing%'
);

delete from public.businesses
where name ilike 'QA %'
   or name ilike '%testing%';
