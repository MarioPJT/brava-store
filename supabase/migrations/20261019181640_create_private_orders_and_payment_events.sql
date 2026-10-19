-- Orders contain customer PII and payment references; never expose them to the public Data API.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  status text not null default 'pending' check (status in ('pending','paid','failed','expired')),
  customer jsonb not null,
  items jsonb not null,
  subtotal_cop integer not null check (subtotal_cop >= 0),
  shipping_cop integer not null check (shipping_cop >= 0),
  total_cop integer not null check (total_cop >= 0),
  currency text not null default 'COP' check (currency = 'COP'),
  payment_method text,
  wompi_transaction_id text unique,
  email_sent_at timestamptz,
  sms_sent_at timestamptz,
  notification_error text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant select, insert, update on public.orders to service_role;
create policy "Admins can read orders"
on public.orders for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- Calculate prices from the live catalog, reserve stock, and persist the immutable order snapshot.
create or replace function public.create_order_for_checkout(
  p_customer jsonb,
  p_items jsonb,
  p_shipping_carrier_id text
)
returns table(order_id uuid, order_reference text, amount_in_cents bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
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
  insert into public.orders(id,reference,status,customer,items,subtotal_cop,shipping_cop,total_cop)
  values(v_order_id,v_reference,'pending',p_customer,v_snapshot,v_subtotal,v_shipping,v_subtotal+v_shipping);

  return query select v_order_id, v_reference, ((v_subtotal + v_shipping)::bigint * 100);
end;
$$;

-- Wompi events are authenticated by the Edge Function before this state transition is called.
create or replace function public.apply_wompi_transaction(
  p_reference text,
  p_transaction_id text,
  p_status text,
  p_amount_in_cents bigint,
  p_currency text,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
begin
  select * into v_order from public.orders where reference = p_reference for update;
  if not found then raise exception 'Pedido no encontrado.' using errcode = 'P0002'; end if;
  if p_currency <> v_order.currency or p_amount_in_cents <> (v_order.total_cop::bigint * 100) then
    raise exception 'El valor del pago no coincide con el pedido.' using errcode = '22023';
  end if;

  if p_status = 'APPROVED' then
    update public.orders set status='paid', paid_at=coalesce(paid_at,now()),
      wompi_transaction_id=coalesce(wompi_transaction_id,p_transaction_id), payment_method=p_payment_method
    where id=v_order.id and status in ('pending','paid');
  elsif p_status in ('DECLINED','ERROR','VOIDED') and v_order.status='pending' then
    update public.orders set status='failed', wompi_transaction_id=coalesce(wompi_transaction_id,p_transaction_id), payment_method=p_payment_method
    where id=v_order.id;
    for v_item in select value from jsonb_array_elements(v_order.items) loop
      update public.products set stock=stock+(v_item->>'quantity')::integer, updated_at=now()
      where id=(v_item->>'id')::bigint;
    end loop;
  end if;

  select * into v_order from public.orders where id=v_order.id;
  return jsonb_build_object('id',v_order.id,'reference',v_order.reference,'status',v_order.status,
    'customer',v_order.customer,'items',v_order.items,'total_cop',v_order.total_cop,
    'email_sent_at',v_order.email_sent_at,'sms_sent_at',v_order.sms_sent_at);
end;
$$;

revoke all on function public.create_order_for_checkout(jsonb,jsonb,text) from public, anon, authenticated;
revoke all on function public.apply_wompi_transaction(text,text,text,bigint,text,text) from public, anon, authenticated;
grant execute on function public.create_order_for_checkout(jsonb,jsonb,text) to service_role;
grant execute on function public.apply_wompi_transaction(text,text,text,bigint,text,text) to service_role;
