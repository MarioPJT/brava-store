-- Solo un cliente con una compra aprobada y el mismo correo verificado puede reseñar.
create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id bigint not null references public.products(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 8 and 1200),
  verified_purchase boolean not null default true,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index product_reviews_product_created_idx on public.product_reviews(product_id, created_at desc);

alter table public.product_reviews enable row level security;
revoke all on public.product_reviews from anon, authenticated;
grant select on public.product_reviews to anon, authenticated;
grant insert (product_id, order_id, user_id, rating, comment) on public.product_reviews to authenticated;

create policy "Anyone can read product reviews"
  on public.product_reviews for select to anon, authenticated using (true);

create or replace function private.review_order_is_eligible(p_order_id uuid, p_product_id bigint, p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    join auth.users u on u.id = p_user_id and u.email_confirmed_at is not null
    where o.id = p_order_id and o.status = 'paid'
      and lower(o.customer->>'email') = lower(u.email)
      and exists (select 1 from jsonb_array_elements(o.items) item where item->>'id' = p_product_id::text)
  );
$$;

revoke all on function private.review_order_is_eligible(uuid, bigint, uuid) from public, anon, authenticated;
grant execute on function private.review_order_is_eligible(uuid, bigint, uuid) to authenticated;

create policy "Verified buyers can review purchased products"
  on public.product_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and private.review_order_is_eligible(order_id, product_id, (select auth.uid())));

create or replace function private.get_reviewable_orders(p_product_id bigint)
returns table(order_id uuid, reference text, paid_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
begin
  if v_user_id is null then raise exception 'Inicia sesión para consultar tus compras.'; end if;
  select u.email into v_email from auth.users u where u.id = v_user_id and u.email_confirmed_at is not null;
  if v_email is null then raise exception 'Confirma tu correo antes de publicar una opinión.'; end if;
  return query
  select o.id, o.reference, o.paid_at from public.orders o
  where o.status = 'paid' and lower(o.customer->>'email') = lower(v_email)
    and exists (select 1 from jsonb_array_elements(o.items) item where item->>'id' = p_product_id::text)
    and not exists (select 1 from public.product_reviews r where r.order_id = o.id and r.product_id = p_product_id)
  order by o.paid_at desc;
end;
$$;

create or replace function public.get_reviewable_orders(p_product_id bigint)
returns table(order_id uuid, reference text, paid_at timestamptz)
language sql security invoker set search_path = ''
as $$ select * from private.get_reviewable_orders(p_product_id); $$;

revoke all on function private.get_reviewable_orders(bigint) from public, anon, authenticated;
grant execute on function private.get_reviewable_orders(bigint) to authenticated;
revoke all on function public.get_reviewable_orders(bigint) from public, anon;
grant execute on function public.get_reviewable_orders(bigint) to authenticated;

create or replace function private.prepare_product_review()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not private.review_order_is_eligible(new.order_id, new.product_id, new.user_id) then
    raise exception 'Solo puedes opinar sobre una compra aprobada asociada a tu correo verificado.';
  end if;
  select coalesce(nullif(btrim(p.display_name), ''), split_part(u.email, '@', 1)) into new.author_name
  from auth.users u left join public.profiles p on p.id = u.id where u.id = new.user_id;
  new.verified_purchase := true;
  return new;
end;
$$;

create trigger prepare_product_review_before_insert before insert on public.product_reviews
for each row execute function private.prepare_product_review();

create or replace function private.refresh_product_review_summary()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.products p set rating = summary.average_rating, reviews = summary.review_count, updated_at = now()
  from (select round(avg(r.rating)::numeric, 1) as average_rating, count(*)::integer as review_count
        from public.product_reviews r where r.product_id = new.product_id) summary
  where p.id = new.product_id;
  return new;
end;
$$;

create trigger refresh_product_review_summary_after_insert after insert on public.product_reviews
for each row execute function private.refresh_product_review_summary();
