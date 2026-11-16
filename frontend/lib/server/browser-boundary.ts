import 'server-only';
import { isIP } from 'node:net';

/** Browser-origin and proxy rules shared by the private JSON and upload adapters. */
export function allowedBrowserOrigin(origin: string | null) {
  const site = new URL(process.env.SITE_URL ?? 'http://127.0.0.1:3000');
  const origins = new Set([site.origin]);
  if (['127.0.0.1', 'localhost'].includes(site.hostname)) {
    for (const hostname of ['127.0.0.1', 'localhost']) {
      const alias = new URL(site.origin);
      alias.hostname = hostname;
      origins.add(alias.origin);
    }
  }
  return origins.has(origin ?? '');
}

export function backendRequestHeaders(request: Request, includeContentType = true) {
  const headers = new Headers();
  for (const name of ['cookie', 'x-csrf-token', ...(includeContentType ? ['content-type'] : [])]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Enabled only behind the private Docker ingress. Caddy overwrites these headers;
  // Tomcat trusts only this frontend's fixed private address, never arbitrary peers.
  if (process.env.NODE_ENV === 'production' && process.env.UP24_TRUST_PROXY_HEADERS === 'true') {
    const address = request.headers.get('x-forwarded-for')?.trim() ?? '';
    if (isIP(address)) headers.set('x-forwarded-for', address);
    const protocol = request.headers.get('x-forwarded-proto');
    if (protocol === 'https' || protocol === 'http') headers.set('x-forwarded-proto', protocol);
  }
  return headers;
}

export async function readLimitedBody(
  request: Request,
  limit: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (!Number.isFinite(declared) || declared < 0 || declared > limit) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > limit) {
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
