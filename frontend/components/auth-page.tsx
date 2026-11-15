'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPanel } from '@/components/auth-panel';
import { NewsroomSignIn } from '@/components/newsroom/newsroom-sign-in';
import type { Account } from '@/lib/cms';
import { useSession } from '@/lib/session';
export function AuthPage({
  editorial = false,
  signup = false,
  workspace = 'admin',
}: {
  editorial?: boolean;
  signup?: boolean;
  workspace?: 'admin' | 'staff';
}) {
  const session = useSession(),
    router = useRouter();
  const destination = session.data?.newsroomEligible
    ? session.data.newsroomAccess
      ? session.data.role === 'ADMIN' ? '/admin' : '/newsroom'
      : session.data.role === 'ADMIN' ? '/admin/sign-in' : '/newsroom/sign-in'
    : '/account';
  useEffect(() => {
    if (session.data && (!editorial || session.data.newsroomAccess)) router.replace(destination);
  }, [session.data, destination, editorial, router]);
  async function authenticated(account: Account) {
    await session.setAccount(account);
    router.replace(
      account.newsroomEligible ? account.newsroomAccess
        ? account.role === 'ADMIN' ? '/admin' : '/newsroom'
        : account.role === 'ADMIN' ? '/admin/sign-in' : '/newsroom/sign-in'
        : '/account',
    );
  }
  return (
    <main id="main-content" lang="en">
      {editorial ? (
        <NewsroomSignIn
          account={session.data}
          onAuthenticated={authenticated}
          signInPath={workspace === 'admin' ? '/admin/sign-in' : '/newsroom/sign-in'}
        />
      ) : (
        <AuthPanel editorial={editorial} signup={signup} onAuthenticated={authenticated} />
      )}
    </main>
  );
}
