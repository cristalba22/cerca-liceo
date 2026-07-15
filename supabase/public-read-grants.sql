-- Permisos publicos minimos para que visitantes puedan ver home, guia, promos y mini carta.
-- RLS sigue activo: estas grants solo permiten que las policies decidan que filas se ven.

grant usage on schema public to anon, authenticated;

grant select on table public.businesses to anon, authenticated;
grant select on table public.offers to anon, authenticated;
grant select on table public.products to anon, authenticated;

do $$
begin
  if to_regclass('public.active_offers') is not null then
    grant select on table public.active_offers to anon, authenticated;
  end if;
end $$;
