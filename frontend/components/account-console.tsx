'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SavedStories } from '@/components/saved-stories';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSession } from '@/lib/session';
import { copy, type SiteLocale } from '@/lib/locale';

const hindiRoles = {
  ADMIN: 'प्रशासक',
  EDITOR: 'संपादक',
  REPORTER: 'रिपोर्टर',
  SUBSCRIBER: 'पाठक',
} as const;

export function AccountConsole({ locale }: { locale: SiteLocale }) {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!session.isLoading && session.data === null) router.replace('/account/sign-in');
  }, [session.isLoading, session.data, router]);
  const [error, setError] = useState('');
  if (session.isLoading)
    return (
      <div className="account-loading" role="status">
        {copy(locale, 'खाता खोल रहे हैं…', 'Opening your account…')}
      </div>
    );
  if (session.error)
    return (
      <section className="empty-state" role="alert">
        <h1>{copy(locale, 'आपका खाता नहीं खुला।', 'Your account could not be opened.')}</h1>
        {locale === 'en' && <p>{session.error.message}</p>}
        <Button onClick={() => session.refetch()}>
          {copy(locale, 'दोबारा कोशिश करें', 'Try again')}
        </Button>
      </section>
    );
  if (!session.data)
    return (
      <div className="account-loading" role="status">
        {copy(locale, 'लॉगिन खोल रहे हैं…', 'Opening sign in…')}
      </div>
    );
  const user = session.data;
  return (
    <div className="account-dashboard">
      <div className="account-welcome">
        <h1>{copy(locale, `स्वागत है, ${user.displayName}।`, `Welcome, ${user.displayName}.`)}</h1>
        <p>{user.email}</p>
        <span className="role-badge">
          {copy(locale, hindiRoles[user.role], user.role.toLowerCase())}
        </span>
        <div className="account-actions">
          {user.newsroomEligible && (
            <Button asChild>
              <Link
                href={
                  user.role === 'ADMIN'
                    ? user.newsroomAccess
                      ? '/admin'
                      : '/admin/sign-in'
                    : user.newsroomAccess
                      ? '/newsroom'
                      : '/newsroom/sign-in'
                }
              >
                {user.role === 'ADMIN'
                  ? copy(locale, 'प्रशासन खोलें', 'Open administration')
                  : copy(locale, 'संपादकीय कक्ष खोलें', 'Open newsroom')}
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await session.signOut();
              } catch (reason) {
                setError(
                  locale === 'en' && reason instanceof Error
                    ? reason.message
                    : copy(locale, 'लॉगआउट नहीं हुआ।', 'Sign-out failed.'),
                );
              }
            }}
          >
            {copy(locale, 'लॉगआउट', 'Sign out')}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await session.signOut(true);
              } catch (reason) {
                setError(
                  locale === 'en' && reason instanceof Error
                    ? reason.message
                    : copy(locale, 'लॉगआउट नहीं हुआ।', 'Sign-out failed.'),
                );
              }
            }}
          >
            {copy(locale, 'सभी उपकरणों से लॉगआउट', 'Sign out everywhere')}
          </Button>
        </div>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <SavedStories locale={locale} />
    </div>
  );
}
