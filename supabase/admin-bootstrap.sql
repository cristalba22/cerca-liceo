-- Ejecutar una vez en Supabase SQL Editor.
-- Cambia el email si usas otro usuario para administrar Cerca Liceo.

update public.profiles
set role = 'admin'
where id in (
  select id
  from auth.users
  where email = 'crisalbavideografo@gmail.com'
);

select id, full_name, role
from public.profiles
where role = 'admin';
