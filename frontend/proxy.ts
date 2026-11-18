import { NextRequest, NextResponse } from 'next/server';

/** Per-response script nonces; styles remain inline-capable for Framer Motion. */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const development = process.env.NODE_ENV === 'development';
  let mediaOrigin = '';
  if (process.env.MEDIA_CDN_URL) {
    const media = new URL(process.env.MEDIA_CDN_URL);
    if (media.protocol !== 'https:' || media.username || media.password || media.search || media.hash || !['', '/'].includes(media.pathname))
      throw new Error('MEDIA_CDN_URL must be an HTTPS media origin.');
    mediaOrigin = ` ${media.origin}`;
  }
  let mediaUploadOrigin = '';
  if (process.env.MEDIA_UPLOAD_ORIGIN) {
    const upload = new URL(process.env.MEDIA_UPLOAD_ORIGIN);
    if (upload.protocol !== 'https:' || upload.username || upload.password || upload.search || upload.hash || !['', '/'].includes(upload.pathname))
      throw new Error('MEDIA_UPLOAD_ORIGIN must be an HTTPS upload origin.');
    mediaUploadOrigin = ` ${upload.origin}`;
  }
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${mediaOrigin}`,
    "font-src 'self'",
    "worker-src 'self'",
    `connect-src 'self'${mediaOrigin}${mediaUploadOrigin}${development ? ' ws: wss:' : ''}`,
    `media-src 'self' https://up24network.com https://www.up24network.com${mediaOrigin}`,
    'frame-src https://www.youtube-nocookie.com https://www.instagram.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.SITE_URL?.startsWith('https://') ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const headers = new Headers(request.headers);
  // Overwrite client input. Authorization stays in server layouts and the API.
  headers.set('x-up24-return-to', request.nextUrl.pathname + request.nextUrl.search);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store');
  if (/^\/(admin|newsroom)(\/|$)/.test(request.nextUrl.pathname))
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
export const config = {
  matcher: [
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|brand/|fonts/|images/|videos/|media/|icons/|sw.js|offline.html|manifest.webmanifest|\\.well-known/|robots.txt|sitemap.xml).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
