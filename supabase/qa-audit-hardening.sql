-- Cerca Liceo - correcciones QA senior post auditoria.
-- Ejecutar en Supabase SQL Editor despues de revisar.

-- 1) Helper reutilizable para saber si el usuario actual es admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- 2) RPC para el panel admin. Evita exponer admin_notes por grants publicos.
create or replace function public.admin_list_businesses()
returns setof public.businesses
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.businesses b
  where public.is_admin()
  order by b.updated_at desc nulls last, b.created_at desc
  limit 250;
$$;

grant execute on function public.admin_list_businesses() to authenticated;

-- 3) Column grants: visitantes y usuarios normales no pueden leer admin_notes.
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

-- 4) Mini carta: visible y editable solo con plan fundador activo,
-- salvo propietario/admin para operaciones necesarias.
drop policy if exists "products public read" on public.products;
create policy "products public read"
on public.products for select
using (
  exists (
    select 1
    from public.businesses b
    where b.id = products.business_id
      and (
        public.is_admin()
        or b.owner_id = auth.uid()
        or (
          b.is_public = true
          and b.plan = 'orders'
          and b.plan_status = 'active'
          and (b.paid_until is null or b.paid_until >= current_date)
        )
      )
  )
);

drop policy if exists "products merchant write own" on public.products;
create policy "products merchant write own"
on public.products for all
using (
  exists (
    select 1
    from public.businesses b
    where b.id = products.business_id
      and b.owner_id = auth.uid()
      and b.plan = 'orders'
      and b.plan_status = 'active'
      and (b.paid_until is null or b.paid_until >= current_date)
  )
)
with check (
  exists (
    select 1
    from public.businesses b
    where b.id = products.business_id
      and b.owner_id = auth.uid()
      and b.plan = 'orders'
      and b.plan_status = 'active'
      and (b.paid_until is null or b.paid_until >= current_date)
  )
);

drop policy if exists "products admin manage" on public.products;
create policy "products admin manage"
on public.products for all
using (public.is_admin())
with check (public.is_admin());
