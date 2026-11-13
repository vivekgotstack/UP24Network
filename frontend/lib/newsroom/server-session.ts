import 'server-only';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Account } from '@/lib/cms';

/** Server boundary: private workspace HTML is never rendered for reader sessions. */
export async function requireNewsroomSession(scope: 'admin' | 'staff' = 'admin'): Promise<Account> {
  const signInPath = scope === 'admin' ? '/admin/sign-in' : '/newsroom/sign-in';
  const sessionCookie = (await cookies()).get('JSESSIONID');
  if (!sessionCookie) redirect(signInPath);
  const response = await fetch(
    `${process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080'}/api/auth/me`,
    {
      headers: { cookie: `JSESSIONID=${sessionCookie.value}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    },
  );
  if (response.status === 401) redirect(signInPath);
  if (!response.ok) throw new Error('The private workspace is temporarily unavailable.');
  const account: Account = await response.json();
  if (!account.newsroomAccess) redirect(signInPath);
  if (scope === 'admin' && account.role !== 'ADMIN') notFound();
  if (scope === 'staff' && account.role === 'ADMIN') redirect('/admin');
  return account;
}
