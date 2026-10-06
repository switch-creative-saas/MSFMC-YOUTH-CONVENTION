import { Resend } from 'npm:resend@6.12.4';
import { serviceClient } from '../_shared/client.ts';

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (!apiKey || !webhookSecret) return new Response('Webhook is not configured', { status: 500 });
  try {
    const payload = await request.text();
    const resend = new Resend(apiKey);
    const event = await resend.webhooks.verify({
      payload,
      webhookSecret,
      headers: { id: request.headers.get('svix-id') ?? '', timestamp: request.headers.get('svix-timestamp') ?? '', signature: request.headers.get('svix-signature') ?? '' },
    }) as { type: string; data: { email_id?: string; to?: string[] }; created_at?: string };
    const messageId = event.data.email_id;
    if (!messageId) return new Response(null, { status: 204 });
    const db = serviceClient();
    await db.from('email_delivery_events').upsert({ provider_event_id: request.headers.get('svix-id'), provider_message_id: messageId, event_type: event.type, recipient: event.data.to?.[0] ?? null, payload: event }, { onConflict: 'provider_event_id' });
    const deliveryStatus = event.type === 'email.delivered' ? 'delivered' : /bounced|complained|failed|suppressed/.test(event.type) ? 'failed' : event.type.replace('email.', '');
    const update: Record<string, unknown> = { delivery_status: deliveryStatus };
    if (deliveryStatus === 'delivered') update.delivered_at = event.created_at ?? new Date().toISOString();
    if (deliveryStatus === 'failed') update.last_error = event.type;
    await db.from('email_outbox').update(update).eq('provider_message_id', messageId);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Invalid Resend webhook', { message: error instanceof Error ? error.message : 'unknown' });
    return new Response('Invalid webhook', { status: 400 });
  }
});
