import { supabase } from './client';

export type RegistrationResponse = { member_id: string; member_code: string; convention_group: string; status_token: string; exec_code?: string; replayed: boolean };

const readableErrors: Record<string, string> = {
  INVALID_LINK: 'This registration link is invalid, expired, or has reached its usage limit.',
  EMAIL_EXISTS: 'This email address has already been registered for this convention.',
  CONSENT_REQUIRED: 'Please confirm consent before submitting your registration.',
  GUARDIAN_CONSENT_REQUIRED: 'Guardian consent is required for attendees under 18.',
  INVALID_BAND: 'Please select an active fellowship band.',
};

export async function submitRegistration(token: string, payload: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ token, source: 'home', payload }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(body.error ?? body.message ?? 'Registration could not be completed.');
    throw new Error(readableErrors[message] ?? message);
  }
  return body as RegistrationResponse;
}

type UploadKind = 'photo' | 'tag';

async function uploadRequest(body: Record<string, unknown>) {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(data.error ?? 'Upload could not be prepared.'));
  return data as { path: string; signedUrl?: string; contentType?: string };
}

export async function uploadRegistrationAsset(kind: UploadKind, memberId: string, statusToken: string, blob: Blob) {
  const upload = await uploadRequest({ action: 'url', kind, member_id: memberId, status_token: statusToken });
  if (!upload.signedUrl || !upload.contentType) throw new Error('Upload URL was not returned.');
  const response = await fetch(upload.signedUrl, { method: 'PUT', headers: { 'Content-Type': upload.contentType, 'x-upsert': 'true' }, body: blob });
  if (!response.ok) throw new Error('Asset upload failed.');
  await uploadRequest({ action: 'attach', kind, member_id: memberId, status_token: statusToken, path: upload.path });
}

export function dataUrlToBlob(dataUrl: string) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] ?? 'application/octet-stream';
  const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}
