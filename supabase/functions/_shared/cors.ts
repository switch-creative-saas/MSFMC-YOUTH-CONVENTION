const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '';

export function corsHeaders(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== allowedOrigin) return { Vary: 'Origin' };
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
}

export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === allowedOrigin;
}
