-- This version is already recorded as applied in the BRAVA Store project; keep the ID in sync.
-- Keep the catalog's authorization aligned with the project's existing admin model.
-- The profiles table exposes each authenticated user's own role; clients cannot update that column.
drop policy if exists "Only admins can create products" on public.products;
drop policy if exists "Only admins can edit products" on public.products;
drop policy if exists "Only admins can delete products" on public.products;

create policy "Only admins can create products"
on public.products for insert to authenticated
with check (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
));

create policy "Only admins can edit products"
on public.products for update to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
));

create policy "Only admins can delete products"
on public.products for delete to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
));
