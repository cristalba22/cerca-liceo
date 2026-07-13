-- Initial data for local/staging Supabase projects.
-- Run after schema.sql from the Supabase SQL editor.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'panaderia@cercaliceo.test', crypt('Cerca2026!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lomeli@cercaliceo.test', crypt('Cerca2026!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'despensa@cercaliceo.test', crypt('Cerca2026!', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, account_type, full_name, whatsapp, section)
values
  ('00000000-0000-0000-0000-000000000101', 'merchant', 'Panaderia La Esquina', '351 555 1001', 'Liceo 2da'),
  ('00000000-0000-0000-0000-000000000102', 'merchant', 'Lo de Meli', '351 555 1002', 'Liceo Procrear'),
  ('00000000-0000-0000-0000-000000000103', 'merchant', 'Despensa Solcito', '351 555 1003', 'Liceo Procrear')
on conflict (id) do nothing;

insert into public.businesses (
  id, owner_id, name, category, section, address, reference, hours, whatsapp, description,
  payment_methods, delivery_label, delivery_zone, has_delivery, order_hours, image_key, tone,
  plan, is_public, is_open, verified, rating, followers_count, distance_label
)
values
  (
    '10000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000101',
    'Panaderia La Esquina',
    'Panaderia',
    'Liceo 2da',
    'Av. Alfonsina Storni 1840',
    'Frente a la plaza chica',
    'Lun a sab - 8:00 a 20:30',
    '351 555 1001',
    'Panaderia de barrio con facturas, criollos y pan casero.',
    'Efectivo y transferencia',
    'Retiro y envio',
    'Envio en Liceo 1ra y 2da',
    true,
    'Pedidos 8:00 a 20:00',
    'bread',
    'amber',
    'orders',
    true,
    true,
    true,
    4.8,
    124,
    '450 m'
  ),
  (
    '10000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000102',
    'Lo de Meli',
    'Comida',
    'Liceo Procrear',
    'Mza 18 Casa 6',
    'A dos cuadras del ingreso principal',
    'Jue a dom - 20:00 a 00:30',
    '351 555 1002',
    'Comida casera nocturna, ideal para resolver la cena.',
    'Efectivo, transferencia y Mercado Pago',
    'Pedido por WhatsApp',
    'Delivery nocturno en Procrear',
    true,
    'Pedidos 20:00 a 00:30',
    'milanesa',
    'orange',
    'orders',
    true,
    true,
    true,
    4.9,
    210,
    '700 m'
  ),
  (
    '10000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000103',
    'Despensa Solcito',
    'Despensa',
    'Liceo Procrear',
    'Agustina Andrade 1930',
    'Al lado del kiosco 24',
    'Todos los dias - 8:00 a 23:00',
    '351 555 1003',
    'Despensa con combos de almacen y envio cercano.',
    'Efectivo y transferencia',
    'Envio por compra minima',
    'Envio cerca de Procrear',
    true,
    'Pedidos 9:00 a 22:30',
    'pantry',
    'yellow',
    'free',
    true,
    true,
    true,
    4.7,
    156,
    '600 m'
  )
on conflict (id) do nothing;

insert into public.products (business_id, name, price, position)
values
  ('10000000-0000-0000-0000-000000000101', 'Docena de facturas', 4200, 1),
  ('10000000-0000-0000-0000-000000000101', 'Pan casero', 1600, 2),
  ('10000000-0000-0000-0000-000000000101', 'Criollos', 2300, 3),
  ('10000000-0000-0000-0000-000000000102', 'Milanesa + papas', 7900, 1),
  ('10000000-0000-0000-0000-000000000102', 'Sanguche de milanesa', 6800, 2),
  ('10000000-0000-0000-0000-000000000102', 'Empanadas docena', 9600, 3),
  ('10000000-0000-0000-0000-000000000103', 'Combo almacen', 8400, 1),
  ('10000000-0000-0000-0000-000000000103', 'Gaseosa 2.25L', 2600, 2),
  ('10000000-0000-0000-0000-000000000103', 'Yerba 1kg', 3900, 3)
on conflict do nothing;

insert into public.offers (business_id, title, description, category, section, price, price_label, image_key, tone, highlight, expires_at)
values
  ('10000000-0000-0000-0000-000000000101', 'Docena de facturas', 'Promo disponible para retiro por mostrador.', 'Panaderia', 'Liceo 2da', 4200, '$4.200', 'bread', 'amber', 'Retiro inmediato', now() + interval '3 days'),
  ('10000000-0000-0000-0000-000000000102', 'Combo milanesa + papas', 'Milanesa grande con papas. Sale por tandas.', 'Comida', 'Liceo Procrear', 7900, '$7.900', 'milanesa', 'orange', 'Ideal cena', now() + interval '4 days'),
  ('10000000-0000-0000-0000-000000000103', 'Yerba + azucar + fideos', 'Combo de almacen para salir del paso.', 'Despensa', 'Liceo Procrear', 8400, '$8.400', 'pantry', 'yellow', 'Almacen', now() + interval '3 days')
on conflict do nothing;
