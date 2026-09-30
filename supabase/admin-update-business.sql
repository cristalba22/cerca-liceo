-- Actualizacion segura de fichas desde el panel administrativo.
-- Evita depender de UPDATE ... RETURNING bajo RLS y solo permite campos conocidos.

create or replace function public.admin_update_business(
  p_business_id uuid,
  p_changes jsonb
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_business public.businesses;
begin
  if not public.is_admin() then
    raise exception 'No autorizado para editar comercios.' using errcode = '42501';
  end if;

  update public.businesses
  set
    name = case when p_changes ? 'name'
      then coalesce(nullif(trim(p_changes ->> 'name'), ''), name) else name end,
    category = case when p_changes ? 'category'
      then coalesce(nullif(trim(p_changes ->> 'category'), ''), category) else category end,
    section = case when p_changes ? 'section'
      then coalesce(nullif(trim(p_changes ->> 'section'), ''), section) else section end,
    address = case when p_changes ? 'address' then nullif(trim(p_changes ->> 'address'), '') else address end,
    reference = case when p_changes ? 'reference' then nullif(trim(p_changes ->> 'reference'), '') else reference end,
    hours = case when p_changes ? 'hours' then nullif(trim(p_changes ->> 'hours'), '') else hours end,
    whatsapp = case when p_changes ? 'whatsapp' then nullif(trim(p_changes ->> 'whatsapp'), '') else whatsapp end,
    instagram = case when p_changes ? 'instagram' then nullif(trim(p_changes ->> 'instagram'), '') else instagram end,
    is_public = case when p_changes ? 'is_public' then (p_changes ->> 'is_public')::boolean else is_public end,
    is_open = case when p_changes ? 'is_open' then (p_changes ->> 'is_open')::boolean else is_open end,
    verified = case when p_changes ? 'verified' then (p_changes ->> 'verified')::boolean else verified end,
    plan = case when p_changes ? 'plan' then (p_changes ->> 'plan')::business_plan else plan end,
    plan_status = case when p_changes ? 'plan_status' then (p_changes ->> 'plan_status')::plan_status else plan_status end,
    paid_until = case when p_changes ? 'paid_until' then nullif(p_changes ->> 'paid_until', '')::date else paid_until end,
    admin_notes = case when p_changes ? 'admin_notes' then nullif(trim(p_changes ->> 'admin_notes'), '') else admin_notes end,
    updated_at = now()
  where id = p_business_id
  returning * into updated_business;

  if updated_business.id is null then
    raise exception 'No se encontro el comercio.' using errcode = 'P0002';
  end if;

  return updated_business;
end;
$$;

revoke all on function public.admin_update_business(uuid, jsonb) from public, anon;
grant execute on function public.admin_update_business(uuid, jsonb) to authenticated;
