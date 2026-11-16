import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import {
  allowedBrowserOrigin,
  backendRequestHeaders,
  readLimitedBody,
} from '@/lib/server/browser-boundary';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
const MAX_BODY_BYTES = 512 * 1024;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const endpoints: [RegExp, string[]][] = [
  [/^auth\/(csrf|me|workflow)$/, ['GET']],
  [/^auth\/(login|register|logout|logout-all|refresh)$/, ['POST']],
  [/^auth\/newsroom\/(code|verify)$/, ['POST']],
  [/^auth\/password\/(request|reset)$/, ['POST']],
  [/^admin\/articles$/, ['GET', 'POST']],
  [/^admin\/articles\/browse$/, ['GET']],
  [new RegExp(`^admin/articles/${UUID}$`, 'i'), ['GET', 'PUT', 'DELETE']],
  [new RegExp(`^admin/articles/${UUID}/lifecycle$`, 'i'), ['POST']],
  [new RegExp(`^admin/articles/${UUID}/revisions$`, 'i'), ['GET']],
  [new RegExp(`^admin/articles/${UUID}/revisions/[0-9]+$`, 'i'), ['GET']],
  [new RegExp(`^admin/articles/${UUID}/revisions/[0-9]+/restore$`, 'i'), ['POST']],
  [new RegExp(`^admin/articles/${UUID}/publication$`, 'i'), ['POST']],
  [/^admin\/accounts$/, ['GET', 'POST']],
  [/^admin\/accounts\/browse$/, ['GET']],
  [new RegExp(`^admin/accounts/${UUID}$`, 'i'), ['PATCH', 'DELETE']],
  [new RegExp(`^admin/accounts/${UUID}/profile$`, 'i'), ['PATCH']],
  [new RegExp(`^admin/accounts/${UUID}/sessions/revoke$`, 'i'), ['POST']],
  [new RegExp(`^admin/articles/${UUID}/activity$`, 'i'), ['GET']],
  [new RegExp(`^admin/accounts/${UUID}/workflow$`, 'i'), ['GET', 'PUT']],
  [/^admin\/publication\/settings$/, ['GET', 'PUT']],
  [/^admin\/publication\/pages$/, ['GET']],
  [/^admin\/publication\/pages\/[a-z-]+$/, ['PUT']],
  [/^admin\/media$/, ['GET']],
  [/^admin\/media\/storage$/, ['GET', 'PUT']],
  [/^admin\/media\/storage\/sync$/, ['POST']],
  [/^admin\/media\/[a-f0-9]{64}\/retention$/, ['PATCH']],
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
  return readLimitedBody(request, MAX_BODY_BYTES);
}
async function proxy(request: NextRequest, context: Context) {
  const path = (await context.params).path.join('/');
  const endpoint = endpoints.find(([pattern]) => pattern.test(path));
  if (!endpoint) return problem('Not found', 404);
  if (!endpoint[1].includes(request.method))
    return problem('Method not allowed', 405, { Allow: endpoint[1].join(', ') });
  if (request.nextUrl.search) {
    const allowed =
      path === 'admin/articles/browse'
        ? ['status', 'q', 'page', 'size']
        : path === 'admin/accounts/browse'
          ? ['scope', 'q', 'page', 'size']
          : path === 'admin/media'
            ? ['page', 'size']
            : [];
    for (const [key, value] of request.nextUrl.searchParams) {
      if (
        !allowed.includes(key) ||
        request.nextUrl.searchParams.getAll(key).length !== 1 ||
        value.length > 200
      )
        return problem('Unsupported query parameters', 400);
      if (
        ['page', 'size'].includes(key) &&
        (!/^[0-9]+$/.test(value) ||
          Number(value) < 1 ||
          Number(value) > (key === 'size' ? 50 : 1000000))
      )
        return problem('Invalid pagination', 400);
    }
  }
  const mutation = request.method !== 'GET';
  if (mutation) {
    if (!allowedBrowserOrigin(request.headers.get('origin')))
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
    const headers = backendRequestHeaders(request);
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
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) result.headers.set('retry-after', retryAfter);
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
