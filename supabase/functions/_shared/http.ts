import { corsHeaders } from './cors.ts';

export const MAX_BODY_BYTES = 100 * 1024;

export function json(request: Request, body: Record<string, unknown>, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(request), ...headers } });
}

export async function readJson(request: Request) {
  const declaredSize = Number(request.headers.get('content-length') ?? 0);
  if (declaredSize > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
  try { return JSON.parse(text); } catch { throw new Error('INVALID_JSON'); }
}

export function retryAfter(seconds: number) { return { 'Retry-After': String(Math.max(1, Math.ceil(seconds))) }; }
