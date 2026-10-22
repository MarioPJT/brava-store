alter table public.orders
  add column expires_at timestamptz not null default (now() + interval '30 minutes');

drop function public.create_order_for_checkout(jsonb,jsonb,text);

create or replace function public.create_order_for_checkout(
  p_customer jsonb,
  p_items jsonb,
  p_shipping_carrier_id text,
  p_expires_at timestamptz
)
returns table(order_id uuid, order_reference text, amount_in_cents bigint, expiration_time text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_expired record;
  v_product public.products%rowtype;
  v_snapshot jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_shipping integer;
  v_settings jsonb := '{}'::jsonb;
  v_carrier jsonb;
  v_fee integer;
  v_free_minimum integer;
  v_reference text;
  v_order_id uuid;
  v_qty integer;
  v_product_id bigint;
  v_variant text;
begin
  if p_expires_at <= now() or p_expires_at > now() + interval '31 minutes' then
    raise exception 'La sesión de pago venció; inicia de nuevo.' using errcode = '22023';
  end if;

  -- Release inventory reserved by abandoned checkouts when another customer starts checkout.
  for v_expired in select id, items from public.orders where status='pending' and expires_at <= now() for update
  loop
    for v_item in select value from jsonb_array_elements(v_expired.items) loop
      update public.products set stock=stock+(v_item->>'quantity')::integer, updated_at=now()
      where id=(v_item->>'id')::bigint;
    end loop;
    update public.orders set status='expired' where id=v_expired.id;
  end loop;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'El carrito no es válido.' using errcode = '22023';
  end if;
  if length(coalesce(p_customer->>'email','')) > 254 or position('@' in coalesce(p_customer->>'email','')) < 2
    or length(coalesce(p_customer->>'phone','')) < 7
    or length(coalesce(p_customer->>'name','')) < 1
    or length(coalesce(p_customer->>'surname','')) < 1
    or length(coalesce(p_customer->>'address','')) < 4
    or length(coalesce(p_customer->>'city','')) < 2
    or length(coalesce(p_customer->>'department','')) < 2 then
    raise exception 'Completa los datos de contacto y entrega.' using errcode = '22023';
  end if;

  select coalesce(s.settings_data, '{}'::jsonb) into v_settings from public.store_settings s where s.id = 1;
  v_free_minimum := nullif(v_settings->>'free_shipping_minimum','')::integer;
  v_fee := nullif(v_settings->>'shipping_fee','')::integer;
  if p_shipping_carrier_id is not null then
    select c.value into v_carrier
    from jsonb_array_elements(coalesce(v_settings->'shipping_carriers','[]'::jsonb)) as c(value)
    where c.value->>'id' = p_shipping_carrier_id and coalesce((c.value->>'active')::boolean,true)
    limit 1;
    if v_carrier is null then raise exception 'La transportadora seleccionada ya no está disponible.' using errcode = '22023'; end if;
    v_fee := coalesce(nullif(v_carrier->>'fee','')::integer, v_fee);
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'id')::bigint;
    v_qty := (v_item->>'quantity')::integer;
    v_variant := nullif(left(coalesce(v_item->>'variant',''),80),'');
    if v_qty < 1 or v_qty > 10 then raise exception 'Cantidad inválida.' using errcode = '22023'; end if;
    select * into v_product from public.products where id = v_product_id for update;
    if not found or v_product.stock < v_qty then raise exception 'Un producto ya no tiene existencias suficientes.' using errcode = '22023'; end if;
    if v_variant is not null and not (v_variant = any(v_product.variants)) then
      raise exception 'La variante seleccionada no está disponible.' using errcode = '22023';
    end if;
    update public.products set stock = stock - v_qty, updated_at = now() where id = v_product_id;
    v_subtotal := v_subtotal + v_product.price * v_qty;
    v_snapshot := v_snapshot || jsonb_build_array(jsonb_build_object(
      'id',v_product.id,'name',v_product.name,'seller',v_product.seller,'price_cop',v_product.price,
      'quantity',v_qty,'variant',v_variant,'image_url',v_product.image_url
    ));
  end loop;

  if coalesce(v_free_minimum,0) > 0 and v_subtotal >= v_free_minimum then v_shipping := 0;
  else v_shipping := v_fee; end if;
  if v_shipping is null or v_shipping < 0 then
    raise exception 'La tarifa de envío aún no está configurada.' using errcode = '22023';
  end if;

  v_order_id := gen_random_uuid();
  v_reference := 'BR-' || upper(substr(replace(v_order_id::text,'-',''),1,16));
  insert into public.orders(id,reference,status,customer,items,subtotal_cop,shipping_cop,total_cop,expires_at)
  values(v_order_id,v_reference,'pending',p_customer,v_snapshot,v_subtotal,v_shipping,v_subtotal+v_shipping,p_expires_at);

  return query select v_order_id, v_reference, ((v_subtotal + v_shipping)::bigint * 100),
    to_char(p_expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
end;
$$;

revoke all on function public.create_order_for_checkout(jsonb,jsonb,text,timestamptz) from public, anon, authenticated;
grant execute on function public.create_order_for_checkout(jsonb,jsonb,text,timestamptz) to service_role;

create or replace function public.expire_pending_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired record;
  v_item jsonb;
  v_count integer := 0;
begin
  for v_expired in select id, items from public.orders where status='pending' and expires_at <= now() for update
  loop
    for v_item in select value from jsonb_array_elements(v_expired.items) loop
      update public.products set stock=stock+(v_item->>'quantity')::integer, updated_at=now()
      where id=(v_item->>'id')::bigint;
    end loop;
    update public.orders set status='expired' where id=v_expired.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.expire_pending_orders() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('brava-expire-payment-reservations','*/5 * * * *','select public.expire_pending_orders();');
