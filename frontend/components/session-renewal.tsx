'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { renewLogin } from '@/lib/cms';
import { Button } from '@/components/ui/button';

export function SessionRenewal({ destination, signIn }: { destination: string; signIn: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    renewLogin()
      .then((valid) => {
        if (active) router.replace(valid ? destination : signIn);
      })
      .catch(() => {
        if (active) setError('Your account could not be refreshed. Please try again.');
      });
    return () => {
      active = false;
    };
  }, [destination, signIn, router, attempt]);
  return (
    <section className="empty-state" aria-live="polite">
      <h1>{error ? 'Unable to restore your sign-in' : 'Restoring your sign-in…'}</h1>
      {error && (
        <>
          <p role="alert">{error}</p>
          <Button
            onClick={() => {
              setError('');
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </>
      )}
    </section>
  );
}
