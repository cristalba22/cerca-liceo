-- Cerca Liceo - mejoras de producto comerciante
-- Ejecutar en Supabase SQL Editor.

alter table public.businesses
  alter column image_key set default 'generic';

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  business_id uuid references public.businesses(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.app_events
  drop constraint if exists app_events_event_type_check;

alter table public.app_events
  add constraint app_events_event_type_check
  check (event_type in ('page_view', 'business_view', 'offer_view', 'whatsapp_click', 'favorite_click'));

create index if not exists app_events_business_idx
on public.app_events (business_id, created_at desc);

create index if not exists app_events_offer_idx
on public.app_events (offer_id, created_at desc);

alter table public.app_events enable row level security;

drop policy if exists "app events insert public" on public.app_events;
create policy "app events insert public"
on public.app_events for insert
with check (true);

drop policy if exists "app events merchant read own" on public.app_events;
create policy "app events merchant read own"
on public.app_events for select
using (
  exists (
    select 1 from public.businesses b
    where b.id = app_events.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists "app events admin read" on public.app_events;
create policy "app events admin read"
on public.app_events for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create or replace function public.can_create_weekly_free_offer(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.businesses b
      where b.id = target_business_id
        and b.owner_id = auth.uid()
        and (
          (b.plan = 'orders' and b.plan_status = 'active')
          or (
            select count(*)
            from public.offers o
            where o.business_id = target_business_id
              and o.created_at >= now() - interval '7 days'
              and coalesce(o.highlight, '') !~* 'eliminada'
          ) < 1
        )
    );
$$;

grant execute on function public.can_create_weekly_free_offer(uuid) to authenticated;
