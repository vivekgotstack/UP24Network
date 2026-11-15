'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SavedStories } from '@/components/saved-stories';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSession } from '@/lib/session';

export function AccountConsole() {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!session.isLoading && session.data === null) router.replace('/account/sign-in');
  }, [session.isLoading, session.data, router]);
  const [error, setError] = useState('');
  if (session.isLoading)
    return (
      <div className="account-loading" role="status">
        Opening your account…
      </div>
    );
  if (session.error)
    return (
      <section className="empty-state" role="alert">
        <h1>Your account could not be opened.</h1>
        <p>{session.error.message}</p>
        <Button onClick={() => session.refetch()}>Try again</Button>
      </section>
    );
  if (!session.data)
    return (
      <div className="account-loading" role="status">
        Opening sign in…
      </div>
    );
  const user = session.data;
  return (
    <div className="account-dashboard">
      <div className="account-welcome">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>Welcome, {user.displayName}.</h1>
        <p>{user.email}</p>
        <span className="role-badge">{user.role.toLowerCase()}</span>
        <div className="account-actions">
          {user.newsroomEligible && <Button asChild><Link href={user.role === 'ADMIN'
            ? user.newsroomAccess ? '/admin' : '/admin/sign-in'
            : user.newsroomAccess ? '/newsroom' : '/newsroom/sign-in'}>
            {user.role === 'ADMIN' ? 'Open administration' : 'Open newsroom'}
          </Link></Button>}
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await session.signOut();
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : 'Sign-out failed.');
              }
            }}
          >
            Sign out
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await session.signOut(true);
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : 'Sign-out failed.');
              }
            }}
          >
            Sign out everywhere
          </Button>
        </div>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <SavedStories />
    </div>
  );
}
