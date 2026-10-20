-- Suspender una tienda también retira sus productos del catálogo público.
drop policy if exists "Public can read published products" on public.products;
create policy "Public can read products from active stores"
  on public.products for select to anon, authenticated
  using (
    publication_status = 'published'
    and (owner_id is null or exists (
      select 1 from public.seller_profiles s
      where s.user_id = owner_id and s.status = 'approved'
    ))
  );
