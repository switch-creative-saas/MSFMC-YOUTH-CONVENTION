import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/client.ts';
import { json } from '../_shared/http.ts';

const BUCKET = 'mosyf-private';
const SUBJECT = 'Your MOSYF Convention Registration is Confirmed';

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function firstName(name: string) { return name.trim().split(/\s+/)[0] || name; }
function formatDates(start: string, end: string) { return start === end ? start : `${start} to ${end}`; }
function base64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

function emailHtml(input: { member: Record<string, any>; event: Record<string, any>; band: string; departments: string[]; isExecutive: boolean; statusUrl: string }) {
  const { member, event, band, departments, isExecutive, statusUrl } = input;
  const detailRows = [['Name', member.full_name], ['Member ID', member.member_code], ['Fellowship Band', band || 'No Band'], ['Departments', departments.join(', ') || 'None'], ['Convention Group', `Group ${member.convention_group}`], ['Registration Status', 'Confirmed']]
    .map(([label, value]) => `<tr><td style="padding:8px 12px;color:#6b6760">${escapeHtml(label)}</td><td style="padding:8px 12px;font-weight:600;color:#1c1c1c">${escapeHtml(value)}</td></tr>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#f7f4ec;font-family:Arial,sans-serif;color:#1c1c1c"><main style="max-width:620px;margin:0 auto;padding:28px 16px"><section style="background:#ffffff;border-radius:24px;padding:32px"><p style="margin:0;color:#8a8a85;font-size:12px;font-weight:bold;letter-spacing:1px">MOUNTAIN OF SOLUTION YOUTH FELLOWSHIP</p><h1 style="margin:10px 0 4px;font-size:28px">CONVENTION 2026</h1><p>Hello ${escapeHtml(firstName(member.full_name))},</p><p>Your convention registration has been confirmed.</p><table style="border-collapse:collapse;width:100%;background:#f7f4ec;border-radius:12px;overflow:hidden">${detailRows}</table><h2 style="font-size:18px;margin-top:28px">Convention details</h2><p style="line-height:1.7">Theme: <strong>${escapeHtml(event.theme)}</strong><br>Scripture: <strong>${escapeHtml(event.scripture)}</strong><br>Dates: <strong>${escapeHtml(formatDates(event.start_date, event.end_date))}</strong><br>Venue: <strong>${escapeHtml(event.venue)}</strong></p>${isExecutive ? '<p>Your registration is pending admin approval.</p>' : ''}<p style="margin-top:28px"><a href="${escapeHtml(statusUrl)}" style="display:inline-block;background:#2a2a2a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;margin-right:8px">View my convention status</a><a href="${escapeHtml(statusUrl)}#tag" style="display:inline-block;background:#f9d949;color:#1c1c1c;text-decoration:none;padding:12px 18px;border-radius:999px">Print my convention tag</a></p></section></main></body></html>`;
}

function plainText(input: { member: Record<string, any>; event: Record<string, any>; band: string; departments: string[]; isExecutive: boolean; statusUrl: string }) {
  const { member, event, band, departments, isExecutive, statusUrl } = input;
  return `Mountain of Solution Youth Fellowship\nCONVENTION 2026\n\nHello ${firstName(member.full_name)},\n\nYour convention registration has been confirmed.\n\nName: ${member.full_name}\nMember ID: ${member.member_code}\nFellowship Band: ${band || 'No Band'}\nDepartments: ${departments.join(', ') || 'None'}\nConvention Group: Group ${member.convention_group}\nRegistration Status: Confirmed\n\nTheme: ${event.theme}\nScripture: ${event.scripture}\nDates: ${formatDates(event.start_date, event.end_date)}\nVenue: ${event.venue}\n${isExecutive ? '\nYour registration is pending admin approval.\n' : ''}\nView my convention status: ${statusUrl}\nPrint my convention tag: ${statusUrl}#tag`;
}

async function sendWithResend(payload: Record<string, unknown>) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  if (!apiKey || !from) throw new Error('Email delivery is not configured.');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, ...payload }) });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`RESEND_${response.status}:${detail.slice(0, 300)}`);
    (error as Error & { retryable?: boolean }).retryable = response.status === 429;
    throw error;
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request) && request.headers.get('authorization') !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) return json(request, { error: 'Origin is not allowed.' }, 403);
  if (request.headers.get('authorization') !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) return json(request, { error: 'Unauthorized.' }, 401);

  try {
    const db = serviceClient();
    const { data: rows, error } = await db.from('email_outbox').select('*').eq('status', 'pending').lt('attempts', 5).order('created_at').limit(20);
    if (error) throw error;
    let sent = 0; let failed = 0;
    for (const row of rows ?? []) {
      const [{ data: member }, { data: event }, { data: executive }] = await Promise.all([
        db.from('members').select('*').eq('id', row.member_id).single(), db.from('events').select('*').eq('id', row.event_id).single(), db.from('executive_profiles').select('exec_code,approval').eq('member_id', row.member_id).maybeSingle(),
      ]);
      if (!member || !event) { await db.from('email_outbox').update({ status: 'failed', attempts: row.attempts + 1, last_error: 'Missing member or event.' }).eq('id', row.id); failed++; continue; }
      const [{ data: band }, { data: departmentRows }] = await Promise.all([
        member.band_id ? db.from('list_items').select('name').eq('id', member.band_id).maybeSingle() : Promise.resolve({ data: null }),
        db.from('member_departments').select('department_id').eq('member_id', member.id),
      ]);
      const departmentIds = (departmentRows ?? []).map((item: { department_id: string }) => item.department_id);
      const { data: departments } = departmentIds.length ? await db.from('list_items').select('name').in('id', departmentIds) : { data: [] };
      const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');
      const statusUrl = `${appUrl}/#/status/${member.status_token}`;
      const model = { member, event, band: band?.name ?? 'No Band', departments: (departments ?? []).map((item: { name: string }) => item.name), isExecutive: Boolean(executive), statusUrl };
      const tagPath = `${member.event_id}/${member.id}.png`;
      const { data: tag } = await db.storage.from(BUCKET).download(tagPath);
      const attachments = tag ? [{ filename: `MOSYF-Tag-${member.member_code}.png`, content: base64(new Uint8Array(await tag.arrayBuffer())) }] : undefined;
      try {
        await sendWithResend({ to: [row.to_email], subject: SUBJECT, html: emailHtml(model), text: plainText(model), attachments });
        await db.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('id', row.id);
        sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Email delivery failed.';
        if ((error as Error & { retryable?: boolean }).retryable) break;
        await db.from('email_outbox').update({ attempts: row.attempts + 1, last_error: message.slice(0, 500) }).eq('id', row.id);
        failed++;
      }
    }
    return json(request, { sent, failed });
  } catch (error) {
    console.error('email worker failed', { message: error instanceof Error ? error.message : 'unknown' });
    return json(request, { error: 'Email processing could not be completed.' }, 500);
  }
});
