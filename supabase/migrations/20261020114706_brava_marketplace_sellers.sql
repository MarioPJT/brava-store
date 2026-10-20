-- Vendedores reciben permisos de catálogo propios, separados del rol administrador.
create table public.seller_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  store_name text not null check (char_length(btrim(store_name)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 800),
  contact_email text not null,
  instagram_url text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.seller_profiles enable row level security;
revoke all on public.seller_profiles from anon, authenticated;
grant select on public.seller_profiles to authenticated;
grant insert (user_id,store_name,description,contact_email,instagram_url) on public.seller_profiles to authenticated;
grant update (store_name,description,contact_email,instagram_url,updated_at) on public.seller_profiles to authenticated;

create policy "Sellers can read their application and admins can review all"
  on public.seller_profiles for select to authenticated
  using ((select auth.uid()) = user_id or exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  ));
create policy "Customers can apply to sell"
  on public.seller_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending');
create policy "Sellers can update their storefront details"
  on public.seller_profiles for update to authenticated
  using ((select auth.uid()) = user_id and status in ('pending','approved'))
  with check ((select auth.uid()) = user_id and status in ('pending','approved'));

alter table public.products
  add column owner_id uuid references auth.users(id) on delete cascade,
  add column publication_status text not null default 'published'
    check (publication_status in ('pending','published','rejected','archived')),
  add column moderation_note text not null default '';
create index products_owner_id_idx on public.products(owner_id) where owner_id is not null;
create index products_publication_status_idx on public.products(publication_status);

drop policy if exists "Anyone can read active catalog" on public.products;
drop policy if exists "Only admins can create products" on public.products;
drop policy if exists "Only admins can edit products" on public.products;
drop policy if exists "Only admins can delete products" on public.products;
create policy "Public can read published products"
  on public.products for select to anon, authenticated using (publication_status = 'published');
create policy "Admins can read all products"
  on public.products for select to authenticated using (exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  ));
create policy "Sellers can read their own products"
  on public.products for select to authenticated using (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.seller_profiles s where s.user_id = (select auth.uid())
    )
  );
create policy "Admins can create catalog products"
  on public.products for insert to authenticated with check (exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  ));
create policy "Approved sellers can submit their own products"
  on public.products for insert to authenticated with check (
    owner_id = (select auth.uid()) and publication_status = 'pending'
    and exists (select 1 from public.seller_profiles s
      where s.user_id = (select auth.uid()) and s.status = 'approved')
  );
create policy "Admins can edit all catalog products"
  on public.products for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "Sellers can edit only their own products and resubmit for review"
  on public.products for update to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.seller_profiles s where s.user_id = (select auth.uid()) and s.status = 'approved'
  ))
  with check (owner_id = (select auth.uid()) and publication_status = 'pending' and exists (
    select 1 from public.seller_profiles s where s.user_id = (select auth.uid()) and s.status = 'approved'
  ));
create policy "Admins can delete any product"
  on public.products for delete to authenticated using (exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  ));
create policy "Sellers can delete only their own products"
  on public.products for delete to authenticated using (
    owner_id = (select auth.uid()) and exists (select 1 from public.seller_profiles s
      where s.user_id = (select auth.uid()) and s.status = 'approved')
  );

-- Subscription status is written only by trusted billing/webhook operations.
create table public.seller_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'ai_marketing_monthly' check (plan = 'ai_marketing_monthly'),
  amount_cop integer not null default 29900 check (amount_cop = 29900),
  status text not null default 'inactive' check (status in ('inactive','active','past_due','cancelled')),
  provider text not null default 'wompi',
  provider_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.seller_subscriptions enable row level security;
revoke all on public.seller_subscriptions from anon, authenticated;
grant select on public.seller_subscriptions to authenticated;
create policy "Sellers can read only their own subscription"
  on public.seller_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Admins can read all seller subscriptions"
  on public.seller_subscriptions for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create or replace function private.admin_review_seller(target_user_id uuid, target_status text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin') then
    raise exception 'Administrator access required';
  end if;
  if target_status not in ('approved','rejected','suspended') then raise exception 'Invalid seller status'; end if;
  update public.seller_profiles set status=target_status, reviewed_at=now(), updated_at=now()
    where user_id=target_user_id;
  if not found then raise exception 'Seller application not found'; end if;
end;
$$;
create or replace function public.admin_review_seller(target_user_id uuid, target_status text)
returns void language sql security invoker set search_path = ''
as $$ select private.admin_review_seller(target_user_id,target_status); $$;
revoke all on function private.admin_review_seller(uuid,text) from public, anon, authenticated;
grant execute on function private.admin_review_seller(uuid,text) to authenticated;
revoke all on function public.admin_review_seller(uuid,text) from public, anon;
grant execute on function public.admin_review_seller(uuid,text) to authenticated;
