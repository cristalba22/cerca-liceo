-- Habilita borrar comercios completos solo para administradores.
-- Ejecutar una vez en Supabase > SQL Editor.

drop policy if exists "businesses admin delete" on public.businesses;
create policy "businesses admin delete"
on public.businesses for delete
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "products admin manage" on public.products;
create policy "products admin manage"
on public.products for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
