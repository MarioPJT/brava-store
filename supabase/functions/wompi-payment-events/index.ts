import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

function response(status: number, message: string) {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain' } });
}

function valueAtPath(root: unknown, path: string) {
  return path.split('.').reduce((value: any, key) => value?.[key], root as any);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function formatCop(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return response(405, 'Method not allowed');
  const eventsSecret = Deno.env.get('WOMPI_EVENTS_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!eventsSecret || !supabaseUrl || !serviceRoleKey) return response(503, 'Webhook not configured');

  try {
    const event = await request.json();
    if (event?.event !== 'transaction.updated') return response(200, 'Ignored');
    const signature = event?.signature;
    if (!Array.isArray(signature?.properties) || !signature.properties.length || !Number.isInteger(event?.timestamp)) return response(400, 'Malformed event');
    const signedValues = signature.properties.map((property: string) => valueAtPath(event.data, property));
    if (signedValues.some((value: unknown) => value === undefined || value === null)) return response(400, 'Malformed signature properties');
    const expected = await sha256Hex(`${signedValues.join('')}${event.timestamp}${eventsSecret}`);
    const received = String(request.headers.get('X-Event-Checksum') || signature.checksum || '').toUpperCase();
    if (!constantTimeEqual(expected, received)) return response(401, 'Invalid event signature');

    const transaction = event.data?.transaction;
    if (!transaction?.id || !transaction?.reference) return response(400, 'Missing transaction');
    const apiBase = event.environment === 'prod' ? 'https://production.wompi.co/v1' : event.environment === 'test' ? 'https://sandbox.wompi.co/v1' : '';
    if (!apiBase) return response(400, 'Unknown Wompi environment');
    const verification = await fetch(`${apiBase}/transactions/${encodeURIComponent(transaction.id)}`);
    if (!verification.ok) return response(502, 'Could not verify transaction with Wompi');
    const verified = (await verification.json())?.data;
    if (!verified || verified.id !== transaction.id || verified.reference !== transaction.reference || verified.status !== transaction.status || verified.amount_in_cents !== transaction.amount_in_cents || verified.currency !== transaction.currency) {
      return response(400, 'Transaction details did not match');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: order, error } = await supabase.rpc('apply_wompi_transaction', {
      p_reference: verified.reference,
      p_transaction_id: verified.id,
      p_status: verified.status,
      p_amount_in_cents: verified.amount_in_cents,
      p_currency: verified.currency,
      p_payment_method: verified.payment_method_type || null,
    });
    if (error) {
      console.error('Order payment update failed:', error.message);
      return response(500, 'Could not update order');
    }
    if (order?.status !== 'paid') return response(200, 'Payment is not approved');

    const notifications: string[] = [];
    const customer = order.customer || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const rows = items.map((item: Record<string, unknown>) => `<tr><td style="padding:8px 0">${escapeHtml(item.name)}${item.variant ? ` · ${escapeHtml(item.variant)}` : ''} × ${Number(item.quantity) || 0}</td><td style="padding:8px 0;text-align:right">${formatCop((Number(item.price_cop) || 0) * (Number(item.quantity) || 0))}</td></tr>`).join('');
    const html = `<div style="font-family:Arial,sans-serif;color:#242321;max-width:600px;margin:auto"><p style="letter-spacing:.18em;font-size:12px">BRAVA</p><h1 style="font-size:24px">Tu compra está confirmada</h1><p>Hola ${escapeHtml(customer.name)}, recibimos tu pago para el pedido <strong>${escapeHtml(order.reference)}</strong>.</p><table style="width:100%;border-collapse:collapse">${rows}<tr><td style="padding:14px 0;border-top:1px solid #ddd">Total pagado</td><td style="padding:14px 0;border-top:1px solid #ddd;text-align:right"><strong>${formatCop(Number(order.total_cop))}</strong></td></tr></table><p>Te enviaremos novedades de la entrega a este correo y al teléfono registrado.</p><p>Gracias por comprar en BRAVA.</p></div>`;

    if (!order.email_sent_at) {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      const from = Deno.env.get('RESEND_FROM_EMAIL');
      if (resendKey && from && customer.email) {
        const sent = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [customer.email], subject: `Compra confirmada · ${order.reference}`, html }),
        });
        if (sent.ok) {
          const { error: stampError } = await supabase.from('orders').update({ email_sent_at: new Date().toISOString() }).eq('id', order.id);
          if (stampError) notifications.push('No se pudo marcar el correo como enviado.');
        } else notifications.push(`Correo: proveedor respondió ${sent.status}.`);
      } else notifications.push('Correo: faltan las credenciales de Resend.');
    }

    if (!order.sms_sent_at) {
      const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const token = Deno.env.get('TWILIO_AUTH_TOKEN');
      const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
      const phoneDigits = String(customer.phone || '').replace(/[^\d+]/g, '');
      const to = phoneDigits.startsWith('+') ? phoneDigits : phoneDigits.startsWith('57') ? `+${phoneDigits}` : `+57${phoneDigits.replace(/^0+/, '')}`;
      if (sid && token && fromNumber && customer.phone) {
        const smsBody = new URLSearchParams({ To: to, From: fromNumber, Body: `BRAVA: pago confirmado para el pedido ${order.reference}. Total ${formatCop(Number(order.total_cop))}. Gracias por tu compra.` });
        const sent = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: 'POST', headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: smsBody,
        });
        if (sent.ok) {
          const { error: stampError } = await supabase.from('orders').update({ sms_sent_at: new Date().toISOString() }).eq('id', order.id);
          if (stampError) notifications.push('No se pudo marcar el SMS como enviado.');
        } else notifications.push(`SMS: proveedor respondió ${sent.status}.`);
      } else notifications.push('SMS: faltan las credenciales de Twilio.');
    }

    if (notifications.length) {
      await supabase.from('orders').update({ notification_error: notifications.join(' ').slice(0, 500) }).eq('id', order.id);
      return response(500, 'Payment confirmed; notification will retry');
    }
    return response(200, 'Payment confirmed and notifications processed');
  } catch (error) {
    console.error('Wompi event processing failed:', error instanceof Error ? error.message : 'unknown error');
    return response(500, 'Webhook processing failed');
  }
});
