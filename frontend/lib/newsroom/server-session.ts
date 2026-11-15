import 'server-only';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Account } from '@/lib/cms';

/** Server boundary: private workspace HTML is never rendered for reader sessions. */
export async function requireNewsroomSession(scope: 'admin' | 'staff' = 'admin'): Promise<Account> {
  const signInPath = scope === 'admin' ? '/admin/sign-in' : '/newsroom/sign-in';
  const [jar, requestHeaders] = await Promise.all([cookies(), headers()]);
  const sessionCookie = jar.get('UP24_ACCESS');
  const returnTo =
    requestHeaders.get('x-up24-return-to') ?? (scope === 'admin' ? '/admin' : '/newsroom/articles');
  const renewPath = `/account/renew?next=${encodeURIComponent(returnTo)}`;
  if (!sessionCookie) redirect(jar.has('UP24_REFRESH') ? renewPath : signInPath);
  const response = await fetch(
    `${process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080'}/api/auth/me`,
    {
      headers: { cookie: `UP24_ACCESS=${sessionCookie.value}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    },
  );
  if (response.status === 401) redirect(jar.has('UP24_REFRESH') ? renewPath : signInPath);
  if (!response.ok) throw new Error('The private workspace is temporarily unavailable.');
  const account: Account = await response.json();
  if (!account.newsroomAccess) redirect(signInPath);
  if (scope === 'admin' && account.role !== 'ADMIN') notFound();
  if (scope === 'staff' && account.role === 'ADMIN') redirect('/admin');
  return account;
}
