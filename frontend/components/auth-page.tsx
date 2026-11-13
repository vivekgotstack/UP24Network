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
}: {
  editorial?: boolean;
  signup?: boolean;
}) {
  const session = useSession(),
    router = useRouter();
  const destination = editorial ? '/admin' : '/account';
  useEffect(() => {
    if (session.data && (!editorial || session.data.newsroomAccess)) router.replace(destination);
  }, [session.data, destination, editorial, router]);
  async function authenticated(account: Account) {
    await session.mutate(account, { revalidate: false });
    router.replace(editorial && account.newsroomAccess ? '/admin' : '/account');
  }
  return (
    <main id="main-content" lang="en">
      {editorial ? (
        <NewsroomSignIn account={session.data} onAuthenticated={authenticated} />
      ) : (
        <AuthPanel editorial={editorial} signup={signup} onAuthenticated={authenticated} />
      )}
    </main>
  );
}
