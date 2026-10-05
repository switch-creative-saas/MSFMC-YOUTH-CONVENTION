import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const { token, payload } = await request.json();
    if (!token || !payload) return Response.json({ error: 'A registration token and payload are required.' }, { status: 400 });
    const url = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceRole) return Response.json({ error: 'Registration service is not configured.' }, { status: 500 });
    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc('register_member', { p_token: token, p_payload: payload, p_source: 'home' });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid registration request.' }, { status: 400 });
  }
});
