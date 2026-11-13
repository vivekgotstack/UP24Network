import 'server-only';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Account } from '@/lib/cms';

/** Server boundary: private workspace HTML is never rendered for reader sessions. */
export async function requireNewsroomSession(ownerOnly = false): Promise<Account> {
  const sessionCookie = (await cookies()).get('JSESSIONID');
  if (!sessionCookie) redirect('/admin/sign-in');
  const response = await fetch(
    `${process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080'}/api/auth/me`,
    {
      headers: { cookie: `JSESSIONID=${sessionCookie.value}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    },
  );
  if (response.status === 401) redirect('/admin/sign-in');
  if (!response.ok) throw new Error('The private workspace is temporarily unavailable.');
  const account: Account = await response.json();
  if (!account.newsroomAccess) redirect('/admin/sign-in');
  if (ownerOnly && account.role !== 'ADMIN') notFound();
  return account;
}
