import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(body: unknown, status = 200, origin = '*') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin },
  });
}

function clean(value: unknown, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

Deno.serve(async (request) => {
  const configuredOrigin = Deno.env.get('APP_BASE_URL')?.replace(/\/$/, '');
  const requestOrigin = request.headers.get('origin') || '';
  const localOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin);
  const allowedOrigin = requestOrigin === configuredOrigin || localOrigin ? requestOrigin : configuredOrigin || '*';

  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allowedOrigin } });
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405, allowedOrigin);
  if (requestOrigin && requestOrigin !== configuredOrigin && !localOrigin) return json({ error: 'Origen no autorizado.' }, 403, allowedOrigin);

  const publicKey = Deno.env.get('WOMPI_PUBLIC_KEY');
  const integritySecret = Deno.env.get('WOMPI_INTEGRITY_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!publicKey || !integritySecret || !supabaseUrl || !serviceRoleKey) {
    return json({ error: 'El checkout seguro aún no está configurado.' }, 503, allowedOrigin);
  }

  try {
    const clientAddress = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
    if (clientAddress) {
      const addressDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientAddress));
      const addressHash = Array.from(new Uint8Array(addressDigest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: allowed, error: limitError } = await supabase.rpc('consume_checkout_rate_limit', { p_address_hash: addressHash });
      if (limitError) throw new Error('Checkout rate limit unavailable');
      if (!allowed) return json({ error: 'Has iniciado varios intentos. Espera unos minutos e inténtalo de nuevo.' }, 429, allowedOrigin);
    }

    const body = await request.json();
    if (body?.acceptedTerms !== true) return json({ error: 'Debes aceptar los términos para continuar.' }, 400, allowedOrigin);
    const input = body?.customer || {};
    const customer = {
      name: clean(input.name, 80), surname: clean(input.surname, 100), email: clean(input.email, 254).toLowerCase(),
      phone: clean(input.phone, 30), address: clean(input.address, 180), extra_address: clean(input.extraAddress, 120),
      location_notes: clean(input.locationNotes, 500), city: clean(input.city, 100), department: clean(input.department, 100),
      postal_code: clean(input.postalCode, 20), document_type: clean(input.documentType, 20), document_number: clean(input.documentNumber, 40),
    };
    if (!customer.email.includes('@') || !customer.phone || !customer.name || !customer.surname || !customer.address || !customer.city || !customer.department || !customer.document_number) {
      return json({ error: 'Revisa los datos obligatorios de contacto y entrega.' }, 400, allowedOrigin);
    }
    const items = Array.isArray(body?.items) ? body.items.map((item: Record<string, unknown>) => ({
      id: Number(item.id), quantity: Number(item.quantity), variant: clean(item.variant, 80) || null,
    })) : [];
    if (!items.length || items.some((item: { id: number; quantity: number }) => !Number.isSafeInteger(item.id) || item.id < 1 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) {
      return json({ error: 'El carrito no es válido. Actualízalo e intenta de nuevo.' }, 400, allowedOrigin);
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.rpc('create_order_for_checkout', {
      p_customer: customer,
      p_items: items,
      p_shipping_carrier_id: clean(body?.shippingCarrierId, 100) || null,
      p_expires_at: expiresAt,
    }).single();
    if (error) {
      const knownMessage = /transportadora|envío|existencias|variante|datos|cantidad|carrito/i.test(error.message);
      return json({ error: knownMessage ? error.message : 'No se pudo preparar el pedido. Intenta de nuevo.' }, 400, allowedOrigin);
    }

    const amountInCents = Number(data.amount_in_cents);
    const reference = String(data.order_reference);
    const expirationTime = String(data.expiration_time);
    const integrity = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${reference}${amountInCents}COP${expirationTime}${integritySecret}`));
    const signature = Array.from(new Uint8Array(integrity), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const payment = new URL('https://checkout.wompi.co/p/');
    payment.searchParams.set('public-key', publicKey);
    payment.searchParams.set('currency', 'COP');
    payment.searchParams.set('amount-in-cents', String(amountInCents));
    payment.searchParams.set('reference', reference);
    payment.searchParams.set('signature:integrity', signature);
    payment.searchParams.set('customer-data:email', customer.email);
    payment.searchParams.set('customer-data:full-name', `${customer.name} ${customer.surname}`);
    const phoneDigits = customer.phone.replace(/\D/g, '');
    payment.searchParams.set('customer-data:phone-number', phoneDigits.startsWith('57') ? phoneDigits.slice(2) : phoneDigits);
    payment.searchParams.set('customer-data:phone-number-prefix', '+57');
    payment.searchParams.set('customer-data:legal-id', customer.document_number);
    payment.searchParams.set('customer-data:legal-id-type', ({ 'C.C.': 'CC', 'C.E.': 'CE', Pasaporte: 'PP', NIT: 'NIT' } as Record<string, string>)[customer.document_type] || 'OTHER');
    payment.searchParams.set('expiration-time', expirationTime);
    const redirectBase = configuredOrigin || requestOrigin;
    if (redirectBase) payment.searchParams.set('redirect-url', `${redirectBase}/?payment=pending&reference=${encodeURIComponent(reference)}`);

    return json({ paymentUrl: payment.toString(), reference }, 200, allowedOrigin);
  } catch (error) {
    console.error('Checkout initialization failed:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'No se pudo iniciar el pago. Intenta de nuevo.' }, 500, allowedOrigin);
  }
});
