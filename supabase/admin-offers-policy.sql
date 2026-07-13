-- Permite que el administrador pause/elimine publicaciones desde el panel.
-- Ejecutar una vez en Supabase > SQL Editor.

drop policy if exists "offers admin manage" on public.offers;
create policy "offers admin manage"
on public.offers for all
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
