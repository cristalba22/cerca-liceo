insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-photos',
  'business-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "business photos public read" on storage.objects;
create policy "business photos public read"
on storage.objects
for select
to public
using (bucket_id = 'business-photos');

drop policy if exists "business photos authenticated upload" on storage.objects;
create policy "business photos authenticated upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or owner = (select auth.uid())
  )
);

drop policy if exists "business photos owner update" on storage.objects;
create policy "business photos owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'business-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or owner = (select auth.uid())
  )
)
with check (
  bucket_id = 'business-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or owner = (select auth.uid())
  )
);

drop policy if exists "business photos owner delete" on storage.objects;
create policy "business photos owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or owner = (select auth.uid())
  )
);
