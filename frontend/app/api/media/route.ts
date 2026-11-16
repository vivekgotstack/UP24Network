import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import {
  allowedBrowserOrigin,
  backendRequestHeaders,
  readLimitedBody,
} from '@/lib/server/browser-boundary';

export const runtime = 'nodejs';
const MAX_UPLOAD = 12 * 1024 * 1024;
let conversions = 0;
sharp.cache({ memory: 32, items: 32, files: 0 });
sharp.concurrency(2);
const problem = (detail: string, status: number) =>
  NextResponse.json({ detail }, { status, headers: { 'cache-control': 'no-store' } });

export async function POST(request: NextRequest) {
  if (!allowedBrowserOrigin(request.headers.get('origin')) || !request.headers.has('x-csrf-token'))
    return problem('Invalid upload origin or missing CSRF token.', 403);
  if (conversions >= 2)
    return problem('Two images are already being optimized. Please retry shortly.', 429);
  const backend = process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080';
  const headers = backendRequestHeaders(request, false);
  try {
    const account = await fetch(`${backend}/api/auth/me`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!account.ok) return problem('Sign in again before uploading.', account.status);
    const user = await account.json();
    if (!user.newsroomAccess || !['ADMIN', 'EDITOR', 'REPORTER'].includes(user.role))
      return problem('Editorial access required.', 403);
  } catch {
    return problem('The newsroom is temporarily unavailable.', 503);
  }
  // Recheck after authentication: concurrent callers may have filled the slots.
  if (conversions >= 2)
    return problem('Two images are already being optimized. Please retry shortly.', 429);
  conversions++;
  let imageProcessed = false;
  try {
    const bytes = await readLimitedBody(request, MAX_UPLOAD + 65536);
    if (!bytes) return problem('Choose an image smaller than 12 MB.', 413);
    const bounded = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: new Uint8Array(bytes),
    });
    const form = await bounded.formData();
    const file = form.get('file');
    if (!(file instanceof File) || form.getAll('file').length !== 1 || file.size > MAX_UPLOAD)
      return problem('Choose one photograph smaller than 12 MB.', 400);
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: 24_000_000, animated: false });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp', 'avif', 'heif'].includes(metadata.format ?? ''))
      return problem('Use a JPEG, PNG, WebP or AVIF photograph.', 415);
    const optimized = await image
      .rotate()
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    if (optimized.length > 2 * 1024 * 1024)
      return problem('The optimized image is still too large. Choose a smaller photograph.', 413);
    const outgoing = new FormData();
    outgoing.set(
      'file',
      new Blob([new Uint8Array(optimized)], { type: 'image/webp' }),
      file.name.replace(/\.[^.]+$/, '') + '.webp',
    );
    outgoing.set('originalBytes', String(file.size));
    imageProcessed = true;
    const response = await fetch(`${backend}/api/admin/media`, {
      method: 'POST',
      headers,
      body: outgoing,
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
        'cache-control': 'private, no-store',
      },
    });
  } catch {
    if (imageProcessed) return problem('Media storage is temporarily unavailable. Please retry shortly.', 503);
    return problem('This image could not be processed. Choose a valid photograph.', 400);
  } finally {
    conversions--;
  }
}
