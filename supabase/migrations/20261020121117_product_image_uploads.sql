-- Product photos are public catalog media; uploads remain limited to the signed-in owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Each uploader can only create files inside their own user-id folder.
create policy "Admins and approved sellers can upload product images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (select 1 from public.seller_profiles s where s.user_id = (select auth.uid()) and s.status = 'approved')
  )
);
