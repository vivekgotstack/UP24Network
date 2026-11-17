import { NextRequest, NextResponse } from 'next/server';
import { allowedBrowserOrigin, backendRequestHeaders } from '@/lib/server/browser-boundary';

export const runtime = 'nodejs';
const MAX_BYTES = 250 * 1024 * 1024;
const problem = (detail: string, status: number) => NextResponse.json({ detail }, { status, headers: { 'cache-control': 'private, no-store' } });
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) return problem('Upload not found.', 404);
  if (!allowedBrowserOrigin(request.headers.get('origin')) || !request.headers.has('x-csrf-token')) return problem('Invalid upload origin or missing security token.', 403);
  const length = Number(request.headers.get('content-length'));
  if (!Number.isSafeInteger(length) || length < 12 || length > MAX_BYTES || !request.body) return problem('Choose a video of at most 250 MiB with a known file size.', 413);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/octet-stream') return problem('Use the reserved video upload format.', 415);
  const backend = process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080';
  const headers = backendRequestHeaders(request);
  try {
    const check = await fetch(`${backend}/api/auth/me`, { headers, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!check.ok) return problem('Sign in again before uploading.', check.status);
    const account = await check.json();
    if (!account.newsroomAccess || !['ADMIN', 'EDITOR', 'REPORTER'].includes(account.role)) return problem('Editorial access required.', 403);
    headers.set('content-length', String(length));
    let transferred = 0;
    const bounded = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) { transferred += chunk.byteLength; if (transferred > length) controller.error(new Error('Upload exceeded its reserved size.')); else controller.enqueue(chunk); },
      flush(controller) { if (transferred !== length) controller.error(new Error('The video upload was interrupted.')); },
    }));
    const response = await fetch(`${backend}/api/admin/videos/${id}/source`, {
      method: 'PUT', headers, body: bounded, cache: 'no-store', redirect: 'error', signal: request.signal,
      ...{ duplex: 'half' as const },
    });
    return new NextResponse(response.body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? 'application/json', 'cache-control': 'private, no-store' } });
  } catch { return problem('The video upload was interrupted or storage is temporarily unavailable.', 503); }
}
