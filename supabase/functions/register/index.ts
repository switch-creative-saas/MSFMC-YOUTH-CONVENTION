import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/client.ts';
import { json, readJson, retryAfter } from '../_shared/http.ts';
import { registrationRequestSchema } from '../_shared/validation.ts';

const TEN_MINUTES = 10 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

async function hash(value: string) {
  const salt = Deno.env.get('RATE_LIMIT_SALT');
  if (!salt) throw new Error('Server configuration is incomplete.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${value}`));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function mappedError(message: string) {
  if (message.includes('INVALID_LINK')) return [410, 'Registration is not open yet.'] as const;
  if (message.includes('EMAIL_EXISTS')) return [409, 'This email address has already been registered.'] as const;
  if (/(CONSENT_REQUIRED|GUARDIAN_CONSENT_REQUIRED|EMAIL_REQUIRED|INVALID_BAND)/.test(message)) return [422, 'Please review the registration details and try again.'] as const;
  return [500, 'Registration could not be completed. Please try again later.'] as const;
}

async function enforceRateLimit(db: ReturnType<typeof serviceClient>, ipHash: string, emailHash: string) {
  const now = Date.now();
  const [{ count: recentIp }, { count: hourlyIp }, { count: hourlyEmail }] = await Promise.all([
    db.from('registration_attempts').select('*', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', new Date(now - TEN_MINUTES).toISOString()),
    db.from('registration_attempts').select('*', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', new Date(now - HOUR).toISOString()),
    db.from('registration_attempts').select('*', { count: 'exact', head: true }).eq('email_hash', emailHash).gte('created_at', new Date(now - HOUR).toISOString()),
  ]);
  if ((recentIp ?? 0) > 5) return HOUR / 6;
  if ((hourlyIp ?? 0) > 30 || (hourlyEmail ?? 0) > 3) return HOUR;
  return 0;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'Origin is not allowed.' }, 403);

  let raw: unknown;
  try { raw = await readJson(request); } catch (error) {
    const code = error instanceof Error ? error.message : '';
    return json(request, { error: code === 'BODY_TOO_LARGE' ? 'Request is too large.' : 'Invalid request body.' }, code === 'BODY_TOO_LARGE' ? 413 : 400);
  }
  const parsed = registrationRequestSchema.safeParse(raw);
  if (!parsed.success) return json(request, { error: 'Please review the registration details and try again.' }, 422);

  try {
    const db = serviceClient();
    const ipHash = await hash(clientIp(request));
    const emailHash = await hash(parsed.data.payload.email.toLowerCase());
    const { error: attemptError } = await db.from('registration_attempts').insert({ ip_hash: ipHash, email_hash: emailHash });
    if (attemptError) throw attemptError;
    if (parsed.data.payload.website) return json(request, { accepted: true }, 200);

    const waitSeconds = await enforceRateLimit(db, ipHash, emailHash);
    if (waitSeconds) return json(request, { error: 'Too many registration attempts. Please try again later.' }, 429, retryAfter(waitSeconds));

    const { data, error } = await db.rpc('register_member', { p_token: parsed.data.token, p_payload: parsed.data.payload, p_source: parsed.data.source });
    if (error) {
      const [status, message] = mappedError(error.message);
      if (status === 500) console.error('register_member failed', { code: error.code, message: error.message });
      return json(request, { error: message }, status);
    }

    const baseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (baseUrl && serviceRole) {
      const dispatch = fetch(`${baseUrl}/functions/v1/send-registration-email`, { method: 'POST', headers: { Authorization: `Bearer ${serviceRole}` } }).catch(error => console.error('email dispatch failed', { message: error instanceof Error ? error.message : 'unknown' }));
      EdgeRuntime.waitUntil(dispatch);
    }
    return json(request, data as Record<string, unknown>, 201);
  } catch (error) {
    console.error('register function failed', { message: error instanceof Error ? error.message : 'unknown' });
    return json(request, { error: 'Registration could not be completed. Please try again later.' }, 500);
  }
});
