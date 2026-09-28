-- Permite guardar fallos anonimos del frontend sin exponer su lectura.
-- Ejecutar una vez en Supabase SQL Editor.

alter table public.app_events
  drop constraint if exists app_events_event_type_check;

alter table public.app_events
  add constraint app_events_event_type_check
  check (event_type in (
    'page_view',
    'business_view',
    'offer_view',
    'whatsapp_click',
    'favorite_click',
    'client_error'
  ));
