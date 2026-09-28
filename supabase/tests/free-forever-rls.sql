-- Transactional smoke test against existing fixtures. All writes are rolled back.
begin;
select set_config('qa.business_id', id::text, true),
       set_config('qa.owner_id', owner_id::text, true)
from public.businesses where is_public = true and plan = 'free' limit 1;
select set_config('qa.other_id', id::text, true)
from public.businesses where owner_id::text <> current_setting('qa.owner_id') limit 1;
select set_config('qa.product_id', gen_random_uuid()::text, true);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('qa.owner_id'), true);
insert into public.products(id, business_id, name, price, is_available, position)
values (current_setting('qa.product_id')::uuid, current_setting('qa.business_id')::uuid,
        'QA rollback - free catalog', 100, true, 0);
insert into public.offers(business_id, title, category, section, expires_at, is_active)
select current_setting('qa.business_id')::uuid, 'QA rollback - free offer ' || n,
       'Comida', 'Liceo Procrear', now() + interval '4 days', true
from generate_series(1, 2) n;
do $$
declare affected integer;
begin
  update public.products set price = 200 where id = current_setting('qa.product_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner could not edit free catalog'; end if;
  if not public.can_create_weekly_free_offer(current_setting('qa.business_id')::uuid) then
    raise exception 'Free merchant cannot publish';
  end if;
  if (select count(*) from public.offers where business_id = current_setting('qa.business_id')::uuid
      and title like 'QA rollback - free offer %') <> 2 then
    raise exception 'Could not publish two free offers in the same week';
  end if;
  if public.can_create_weekly_free_offer(current_setting('qa.other_id')::uuid) then
    raise exception 'Another merchant can publish in this business';
  end if;
  begin
    insert into public.products(business_id, name) values (current_setting('qa.other_id')::uuid, 'Unauthorized test');
    raise exception 'Cross-owner catalog write was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  if not exists (select 1 from public.public_list_products(array[current_setting('qa.business_id')::uuid])
                 where id = current_setting('qa.product_id')::uuid) then
    raise exception 'Free catalog missing from public feed';
  end if;
end $$;

reset role;
update public.businesses set is_public = false where id = current_setting('qa.business_id')::uuid;
set local role anon;
do $$
begin
  if exists (select 1 from public.public_list_products(array[current_setting('qa.business_id')::uuid])) then
    raise exception 'Hidden business exposed in public feed';
  end if;
  if exists (select 1 from public.products where id = current_setting('qa.product_id')::uuid) then
    raise exception 'Hidden product exposed through RLS';
  end if;
end $$;
reset role;
rollback;
select 'PASS: free catalog, owner write, cross-owner rejection, public visibility, hidden protection; all changes rolled back' as result;
