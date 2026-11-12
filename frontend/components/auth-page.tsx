'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPanel } from '@/components/auth-panel';
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
  const destination = editorial && session.data?.role !== 'SUBSCRIBER' ? '/admin' : '/account';
  useEffect(() => {
    if (session.data) router.replace(destination);
  }, [session.data, destination, router]);
  return (
    <main id="main-content" lang="en">
      <AuthPanel
        editorial={editorial}
        signup={signup}
        onAuthenticated={async (account) => {
          await session.mutate(account, { revalidate: false });
          router.replace(editorial && account.role !== 'SUBSCRIBER' ? '/admin' : '/account');
        }}
      />
    </main>
  );
}
