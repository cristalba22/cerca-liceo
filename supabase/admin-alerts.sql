create table if not exists public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  email_status text not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_alerts enable row level security;

drop policy if exists "Admins can read admin alerts" on public.admin_alerts;
create policy "Admins can read admin alerts"
on public.admin_alerts
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can update admin alerts" on public.admin_alerts;
create policy "Admins can update admin alerts"
on public.admin_alerts
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create index if not exists admin_alerts_created_at_idx
on public.admin_alerts (created_at desc);

create index if not exists admin_alerts_event_type_idx
on public.admin_alerts (event_type);
