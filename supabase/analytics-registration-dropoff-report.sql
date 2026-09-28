-- Cerca Liceo - reporte de visitas y abandono de registro.
-- Ejecutar en Supabase > SQL Editor.
-- Ajustar cambios_del_dia si queres comparar contra otra hora exacta.

with params as (
  select
    timestamptz '2026-07-19 00:00:00-03' as cambios_del_dia,
    now() as ahora
),
eventos_filtrados as (
  select e.*
  from public.app_events e
  where coalesce((e.metadata ->> 'exclude')::boolean, false) = false
    and coalesce((e.metadata ->> 'excludeAdmin')::boolean, false) = false
    and coalesce((e.metadata ->> 'exclude_admin')::boolean, false) = false
),
visitas as (
  select
    case when e.created_at < p.cambios_del_dia then 'antes_de_los_cambios' else 'despues_de_los_cambios' end as periodo,
    count(*) filter (where e.event_type = 'page_view') as vistas_pagina,
    count(distinct coalesce(e.metadata ->> 'visitorId', e.metadata ->> 'visitor_id')) filter (where e.event_type = 'page_view') as visitantes_unicos_estimados,
    count(*) filter (where e.event_type = 'business_view') as vistas_locales,
    count(*) filter (where e.event_type = 'offer_view') as vistas_ofertas,
    count(*) filter (where e.event_type = 'whatsapp_click') as clicks_whatsapp
  from eventos_filtrados e
  cross join params p
  group by 1
),
usuarios as (
  select
    u.id,
    u.email,
    u.created_at,
    u.confirmed_at,
    p.account_type,
    p.full_name,
    p.whatsapp,
    p.section
  from auth.users u
  left join public.profiles p on p.id = u.id
),
usuarios_resumen as (
  select
    case when u.created_at < p.cambios_del_dia then 'antes_de_los_cambios' else 'despues_de_los_cambios' end as periodo,
    count(*) as cuentas_creadas,
    count(*) filter (where u.confirmed_at is not null) as cuentas_confirmadas,
    count(*) filter (where u.confirmed_at is null) as cuentas_sin_confirmar_mail,
    count(*) filter (where u.account_type = 'merchant') as cuentas_comercio,
    count(*) filter (where u.account_type = 'neighbor') as cuentas_vecino,
    count(*) filter (where u.account_type is null) as cuentas_sin_perfil
  from usuarios u
  cross join params p
  group by 1
),
comercios_resumen as (
  select
    case when b.created_at < p.cambios_del_dia then 'antes_de_los_cambios' else 'despues_de_los_cambios' end as periodo,
    count(*) as locales_creados,
    count(*) filter (where b.is_public = true) as locales_publicos,
    count(*) filter (
      where nullif(trim(coalesce(b.whatsapp, '')), '') is null
         or (
           coalesce(b.business_type, 'local') = 'local'
           and coalesce(b.has_public_address, true) = true
           and nullif(trim(coalesce(b.address, b.reference, '')), '') is null
           and b.location_lat is null
         )
         or (coalesce(array_length(b.open_days, 1), 0) = 0)
    ) as locales_incompletos,
    count(*) filter (where coalesce(b.plan_status, 'free') = 'active') as locales_plan_activo
  from public.businesses b
  cross join params p
  group by 1
),
abandono_actual as (
  select
    count(*) filter (where u.account_type = 'merchant') as cuentas_comercio_totales,
    count(*) filter (where u.account_type = 'merchant' and b.id is null) as comercios_registrados_sin_local,
    count(*) filter (where u.account_type = 'merchant' and b.id is not null) as comercios_con_local,
    count(*) filter (where u.account_type = 'merchant' and u.confirmed_at is null) as comercios_sin_confirmar_mail
  from usuarios u
  left join public.businesses b on b.owner_id = u.id
),
detalle_abandono as (
  select
    u.email,
    u.full_name,
    u.created_at,
    u.confirmed_at,
    u.section,
    case
      when u.confirmed_at is null then 'Creo cuenta pero no confirmo mail'
      when b.id is null then 'Creo cuenta comercio pero no cargo local'
      when nullif(trim(coalesce(b.whatsapp, '')), '') is null then 'Local sin WhatsApp'
      when coalesce(b.business_type, 'local') = 'local'
        and coalesce(b.has_public_address, true) = true
        and nullif(trim(coalesce(b.address, b.reference, '')), '') is null
        and b.location_lat is null then 'Local sin direccion ni pin'
      else 'Tiene local cargado'
    end as estado_embudo,
    b.name as local,
    b.category,
    b.section as seccion_local,
    b.created_at as local_creado
  from usuarios u
  left join public.businesses b on b.owner_id = u.id
  where u.account_type = 'merchant'
  order by u.created_at desc
)
select '1_visitas' as bloque, to_jsonb(v.*) as datos
from visitas v
union all
select '2_usuarios', to_jsonb(u.*)
from usuarios_resumen u
union all
select '3_comercios', to_jsonb(c.*)
from comercios_resumen c
union all
select '4_abandono_actual', to_jsonb(a.*)
from abandono_actual a
union all
select '5_detalle_abandono', jsonb_agg(to_jsonb(d.*))
from detalle_abandono d;
