-- Cerca Liceo: all merchant tools are permanently free.
-- Run after qa-audit-hardening.sql and public-feed-rpc.sql.
-- No business, product, offer, ownership or moderation data is rewritten.
begin;

drop policy if exists "products public read" on public.products;
create policy "products public read"
on public.products for select
using (
  exists (
    select 1 from public.businesses b
    where b.id = products.business_id
      and b.is_public = true
  )
);

drop policy if exists "products merchant write own" on public.products;
create policy "products merchant write own"
on public.products for all to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = products.business_id and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = products.business_id and b.owner_id = auth.uid()
  )
);

-- Keep the old RPC name for clients still running an earlier release.
create or replace function public.can_create_weekly_free_offer(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target_business_id and b.owner_id = auth.uid()
  );
$$;
revoke execute on function public.can_create_weekly_free_offer(uuid) from public, anon;
grant execute on function public.can_create_weekly_free_offer(uuid) to authenticated;

create or replace function public.public_list_products(p_business_ids uuid[])
returns table (
  id uuid,
  business_id uuid,
  name text,
  price numeric,
  is_available boolean,
  product_position integer
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.business_id, p.name, p.price, p.is_available, p.position
  from public.products p
  join public.businesses b on b.id = p.business_id
  where p.is_available = true
    and b.is_public = true
    and p.business_id = any(coalesce(p_business_ids, array[]::uuid[]))
  order by p.business_id, p.position asc;
$$;
revoke execute on function public.public_list_products(uuid[]) from public;
grant execute on function public.public_list_products(uuid[]) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
