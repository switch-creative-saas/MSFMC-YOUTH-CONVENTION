import { corsHeaders } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/client.ts';
import { json, readJson } from '../_shared/http.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json(request, { error: 'Unauthorized.' }, 401);
    const db = serviceClient();
    const { data: identity } = await db.auth.getUser(token);
    if (!identity.user) return json(request, { error: 'Unauthorized.' }, 401);
    const { data: profile } = await db.from('profiles').select('role').eq('user_id', identity.user.id).maybeSingle();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) return json(request, { error: 'Forbidden.' }, 403);
    const body = await readJson(request) as { action?: string; eventId?: string; outboxId?: string };
    if (!body.eventId) return json(request, { error: 'An event is required.' }, 422);
    if (body.action === 'resend') {
      const { error } = await db.from('email_outbox').update({ status: 'pending', delivery_status: 'pending', last_error: null }).eq('id', body.outboxId).eq('event_id', body.eventId).eq('delivery_status', 'failed');
      if (error) throw error;
      return json(request, { queued: true });
    }
    const { data, error } = await db.from('email_outbox').select('id,to_email,status,delivery_status,attempts,last_error,sent_at,created_at,member_id').eq('event_id', body.eventId).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return json(request, { emails: data ?? [] });
  } catch (error) {
    console.error('email-admin failed', { message: error instanceof Error ? error.message : 'unknown' });
    return json(request, { error: 'Email status could not be loaded.' }, 500);
  }
});
