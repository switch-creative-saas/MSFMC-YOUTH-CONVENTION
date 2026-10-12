// ALLOWED_ORIGIN accepts a comma-separated list, e.g. "https://msfmc-youth-convention.vercel.app,http://localhost:5173".
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGIN') ?? '')
  .split(',')
  .map(origin => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

function originAllowed(origin: string) {
  return allowedOrigins.includes(origin.replace(/\/+$/, ''));
}

export function corsHeaders(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || !originAllowed(origin)) return { Vary: 'Origin' };
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
}

export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || originAllowed(origin);
}
