import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
const MAX_BODY_BYTES = 512 * 1024;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const endpoints: [RegExp, string[]][] = [
  [/^auth\/(csrf|me|workflow)$/, ['GET']],
  [/^auth\/(login|register|logout|logout-all|refresh)$/, ['POST']],
  [/^auth\/newsroom\/(code|verify)$/, ['POST']],
  [/^admin\/articles$/, ['GET', 'POST']],
  [/^admin\/articles\/browse$/, ['GET']],
  [new RegExp(`^admin/articles/${UUID}$`, 'i'), ['GET', 'PUT', 'DELETE']],
  [new RegExp(`^admin/articles/${UUID}/lifecycle$`, 'i'), ['POST']],
  [new RegExp(`^admin/articles/${UUID}/revisions$`, 'i'), ['GET']],
  [new RegExp(`^admin/articles/${UUID}/revisions/[0-9]+$`, 'i'), ['GET']],
  [new RegExp(`^admin/articles/${UUID}/revisions/[0-9]+/restore$`, 'i'), ['POST']],
  [new RegExp(`^admin/articles/${UUID}/publication$`, 'i'), ['POST']],
  [/^admin\/accounts$/, ['GET', 'POST']],
  [new RegExp(`^admin/accounts/${UUID}$`, 'i'), ['PATCH']],
  [new RegExp(`^admin/accounts/${UUID}/workflow$`, 'i'), ['GET','PUT']],
  [/^admin\/publication\/settings$/, ['GET','PUT']],
  [/^admin\/publication\/pages$/, ['GET']],
  [/^admin\/publication\/pages\/[a-z-]+$/, ['PUT']],
  [/^admin\/media$/, ['GET']],
  [/^admin\/media\/[a-f0-9]{64}$/, ['DELETE']],
  [/^admin\/assist\/video$/, ['POST']],
  [/^admin\/automations$/, ['GET']],
  [/^admin\/automations\/(youtube|rashifal|health|books|awards)$/, ['PATCH']],
  [/^admin\/automations\/(youtube|rashifal|health|books|awards)\/run$/, ['POST']],
];
function problem(detail: string, status: number, headers?: HeadersInit) {
  const response = NextResponse.json({ detail }, { status, headers });
  response.headers.set('cache-control', 'no-store');
  return response;
}
async function readBody(request: NextRequest) {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (!Number.isFinite(declared) || declared < 0 || declared > MAX_BODY_BYTES) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    parts.push(chunk.value);
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}
async function proxy(request: NextRequest, context: Context) {
  const path = (await context.params).path.join('/');
  const endpoint = endpoints.find(([pattern]) => pattern.test(path));
  if (!endpoint) return problem('Not found', 404);
  if (!endpoint[1].includes(request.method))
    return problem('Method not allowed', 405, { Allow: endpoint[1].join(', ') });
  if (request.nextUrl.search) {
    const allowed = path === 'admin/articles/browse' ? ['status','q','page','size'] : path === 'admin/media' ? ['page','size'] : [];
    for (const [key,value] of request.nextUrl.searchParams) {
      if (!allowed.includes(key) || request.nextUrl.searchParams.getAll(key).length !== 1 || value.length > 200)
        return problem('Unsupported query parameters',400);
      if (['page','size'].includes(key) && (!/^[0-9]+$/.test(value) || Number(value)<1 || Number(value)>(key==='size'?50:1000000)))
        return problem('Invalid pagination',400);
    }
  }
  const mutation = request.method !== 'GET';
  if (mutation) {
    const site = new URL(process.env.SITE_URL ?? 'http://127.0.0.1:3000');
    const origins = new Set([site.origin]);
    if (['127.0.0.1', 'localhost'].includes(site.hostname)) {
      // Both loopback spellings work locally; deployed origins remain explicit.
      for (const hostname of ['127.0.0.1', 'localhost']) {
        const local = new URL(site.origin);
        local.hostname = hostname;
        origins.add(local.origin);
      }
    }
    if (!origins.has(request.headers.get('origin') ?? ''))
      return problem('Invalid request origin', 403);
    if (!request.headers.get('x-csrf-token')) return problem('A CSRF token is required', 403);
  }
  try {
    const body = mutation ? await readBody(request) : undefined;
    if (body === null) return problem('Request body exceeds 512 KiB', 413);
    const contentType = request.headers.get('content-type')?.split(';')[0].trim();
    if (body?.byteLength) {
      const expectedType =
        path === 'auth/login' ? 'application/x-www-form-urlencoded' : 'application/json';
      if (contentType !== expectedType) return problem('Unsupported request content type', 415);
      if (expectedType === 'application/json') {
        try {
          const json: unknown = JSON.parse(new TextDecoder().decode(body));
          if (!json || typeof json !== 'object' || Array.isArray(json))
            return problem('A JSON object is required', 400);
        } catch {
          return problem('Invalid JSON body', 400);
        }
      }
    }
    const headers = new Headers();
    for (const name of ['cookie', 'content-type', 'x-csrf-token']) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = await fetch(
      `${process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080'}/api/${path}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        cache: 'no-store',
        redirect: 'manual',
        body: body?.byteLength ? body : undefined,
        signal: AbortSignal.timeout(60000),
      },
    );
    if (mutation && response.ok) {
      if (path.startsWith('admin/articles')) revalidateTag('articles', { expire: 0 });
      if (path.startsWith('admin/publication')) revalidateTag('publication', { expire: 0 });
    }
    const result = new NextResponse(response.body, { status: response.status });
    result.headers.set('cache-control', 'private, no-store');
    const type = response.headers.get('content-type');
    if (type) result.headers.set('content-type', type);
    for (const cookie of response.headers.getSetCookie())
      result.headers.append('set-cookie', cookie);
    return result;
  } catch {
    return problem('The newsroom service is unavailable. Please try again.', 503);
  }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
