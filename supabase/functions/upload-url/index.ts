import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/client.ts';
import { json, readJson } from '../_shared/http.ts';
import { uploadRequestSchema } from '../_shared/validation.ts';

const BUCKET = 'mosyf-private';
const TEN_MINUTES = 10 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

async function ipHash(request: Request) {
  const salt = Deno.env.get('RATE_LIMIT_SALT');
  if (!salt) throw new Error('Server configuration is incomplete.');
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'Origin is not allowed.' }, 403);
  try {
    const parsed = uploadRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) return json(request, { error: 'Invalid upload request.' }, 422);
    const db = serviceClient();
    const hash = await ipHash(request);
    const now = Date.now();
    const [{ count: shortCount }, { count: hourCount }] = await Promise.all([
      db.from('registration_attempts').select('*', { count: 'exact', head: true }).eq('ip_hash', hash).gte('created_at', new Date(now - TEN_MINUTES).toISOString()),
      db.from('registration_attempts').select('*', { count: 'exact', head: true }).eq('ip_hash', hash).gte('created_at', new Date(now - HOUR).toISOString()),
    ]);
    if ((shortCount ?? 0) >= 5 || (hourCount ?? 0) >= 30) return json(request, { error: 'Too many upload attempts. Please try again later.' }, 429, { 'Retry-After': '600' });
    await db.from('registration_attempts').insert({ ip_hash: hash, email_hash: null });
    const { data: member, error } = await db.from('members').select('id,event_id,status_token').eq('id', parsed.data.member_id).eq('status_token', parsed.data.status_token).maybeSingle();
    if (error || !member) return json(request, { error: 'Registration was not found.' }, 404);

    const extension = parsed.data.kind === 'photo' ? 'jpg' : 'pdf';
    const path = `${member.event_id}/${member.id}.${extension}`;
    if (parsed.data.action === 'attach') {
      if (parsed.data.path !== path) return json(request, { error: 'Invalid attachment path.' }, 422);
      const { data: files, error: listError } = await db.storage.from(BUCKET).list(String(member.event_id), { search: `${member.id}.${extension}` });
      const file = files?.find((candidate: { name: string }) => candidate.name === `${member.id}.${extension}`) as { metadata?: { size?: number; mimetype?: string } } | undefined;
      const maxBytes = parsed.data.kind === 'photo' ? 1024 * 1024 : 1536 * 1024;
      const expectedMime = parsed.data.kind === 'photo' ? 'image/jpeg' : 'application/pdf';
      if (listError || !file || Number(file.metadata?.size ?? 0) > maxBytes || file.metadata?.mimetype !== expectedMime) return json(request, { error: 'The uploaded file did not meet the required format.' }, 422);
      const { error: updateError } = parsed.data.kind === 'photo' ? await db.from('members').update({ photo_path: path }).eq('id', member.id) : { error: null };
      if (updateError) throw updateError;
      return json(request, { path });
    }

    const options = parsed.data.kind === 'photo'
      ? { contentType: 'image/jpeg', upsert: true }
      : { contentType: 'application/pdf', upsert: true };
    const { data, error: signedError } = await db.storage.from(BUCKET).createSignedUploadUrl(path, options);
    if (signedError || !data) throw signedError ?? new Error('Unable to create upload URL.');
    return json(request, { path, token: data.token, signedUrl: data.signedUrl, contentType: options.contentType, maxBytes: parsed.data.kind === 'photo' ? 1024 * 1024 : 3 * 1024 * 1024 });
  } catch (error) {
    console.error('upload-url failed', { message: error instanceof Error ? error.message : 'unknown' });
    return json(request, { error: 'Upload could not be prepared.' }, 500);
  }
});
