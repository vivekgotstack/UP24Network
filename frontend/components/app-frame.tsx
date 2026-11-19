'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ReadingProgress } from '@/components/reading-progress';
import { CookieConsent, CookiePreferencesProvider } from '@/components/cookie-consent';
import type { SiteLocale } from '@/lib/locale';
import { ThemeSwitcher } from '@/components/theme-switcher';

export function AppFrame({
  children,
  footer,
  locale = 'hi',
}: {
  children: ReactNode;
  footer: ReactNode;
  locale?: SiteLocale;
}) {
  const pathname = usePathname();
  const privateArea = /^\/(admin|newsroom)(\/|$)/.test(pathname);
  const frame = (
    <div className={privateArea ? 'workspace-frame' : 'site-shell'}>
      {!privateArea && <ReadingProgress />}
      {privateArea && (
        <div className="flex justify-end px-4 pt-2">
          <ThemeSwitcher locale={locale} />
        </div>
      )}
      {children}
      {!privateArea && footer}
      {!privateArea && <CookieConsent locale={locale} />}
    </div>
  );
  return privateArea ? (
    frame
  ) : (
    <CookiePreferencesProvider locale={locale}>{frame}</CookiePreferencesProvider>
  );
}
