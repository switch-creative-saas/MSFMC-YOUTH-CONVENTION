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
    body: JSON.stringify({ token, payload }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(body.error ?? body.message ?? 'Registration could not be completed.');
    throw new Error(readableErrors[message] ?? message);
  }
  return body as RegistrationResponse;
}
