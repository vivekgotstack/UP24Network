import { NextRequest, NextResponse } from 'next/server';

/** Per-response script nonces; styles remain inline-capable for Framer Motion. */
export async function proxy(request: NextRequest) {
  if (
    (request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/')) &&
    request.nextUrl.pathname !== '/admin/sign-in'
  ) {
    const session = request.cookies.get('JSESSIONID');
    const signIn = () => {
      const response = NextResponse.redirect(new URL('/admin/sign-in', request.url));
      response.headers.set('cache-control', 'private, no-store');
      return response;
    };
    if (!session) return signIn();
    try {
      const response = await fetch(
        `${process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080'}/api/auth/me`,
        {
          headers: { cookie: `JSESSIONID=${session.value}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        },
      );
      if (response.status === 401) return signIn();
      if (!response.ok) throw new Error('Session service unavailable');
      const account: { newsroomAccess?: boolean; role?: string } = await response.json();
      if (!account.newsroomAccess) return signIn();
      const ownerPage = /^\/admin\/(accounts|automations)(\/|$)/.test(request.nextUrl.pathname);
      if (ownerPage && account.role !== 'ADMIN')
        return new NextResponse(null, {
          status: 404,
          headers: { 'cache-control': 'private, no-store' },
        });
    } catch {
      return NextResponse.json(
        { detail: 'The private workspace is temporarily unavailable.' },
        {
          status: 503,
          headers: { 'cache-control': 'private, no-store' },
        },
      );
    }
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const development = process.env.NODE_ENV === 'development';
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${development ? ' ws: wss:' : ''}`,
    "media-src 'self' https://up24network.com https://www.up24network.com",
    'frame-src https://www.youtube-nocookie.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.SITE_URL?.startsWith('https://') ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: [
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|brand/|fonts/|images/|videos/|robots.txt|sitemap.xml).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
