alter table public.businesses
  add column if not exists business_type text not null default 'local',
  add column if not exists has_public_address boolean not null default true;

alter table public.businesses
  drop constraint if exists businesses_business_type_check;

alter table public.businesses
  add constraint businesses_business_type_check
  check (business_type in ('local', 'entrepreneur'));

update public.businesses
set has_public_address = false
where nullif(trim(coalesce(address, '')), '') is null;
