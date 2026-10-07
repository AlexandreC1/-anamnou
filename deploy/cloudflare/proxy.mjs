const unavailable = () =>
  Response.json(
    { message: 'Preview only. Account services are not open yet.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );

export async function proxyApi(request, environment, send = fetch) {
  // Explicit release gate: never connect a public preview to development data.
  if (environment.API_ENABLED !== 'true' || !environment.API_ORIGIN)
    return unavailable();
  let origin;
  try {
    origin = new URL(environment.API_ORIGIN);
  } catch {
    return unavailable();
  }
  if (
    origin.protocol !== 'https:' ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    origin.username ||
    origin.password
  )
    return unavailable();
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith('/api/')) return unavailable();
  // Assign pathname, rather than URL-resolving untrusted paths (//host redirects).
  origin.pathname = incoming.pathname.slice(4);
  origin.search = incoming.search;
  const headers = new Headers(request.headers);
  for (const name of [
    'host',
    'forwarded',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'cf-connecting-ip',
  ])
    headers.delete(name);
  try {
    const upstream = await send(origin.href, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
      signal: AbortSignal.timeout(65000),
    });
    const response = new Response(upstream.body, upstream);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  } catch {
    return unavailable();
  }
}
