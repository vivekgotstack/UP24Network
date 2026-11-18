'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ReadingProgress } from '@/components/reading-progress';
import { CookieConsent, CookiePreferencesProvider } from '@/components/cookie-consent';

export function AppFrame({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const pathname = usePathname();
  const privateArea = /^\/(admin|newsroom)(\/|$)/.test(pathname);
  const frame = (
    <div className={privateArea ? 'workspace-frame' : 'site-shell'}>
      {!privateArea && <ReadingProgress />}
      {children}
      {!privateArea && footer}
      {!privateArea && <CookieConsent />}
    </div>
  );
  return privateArea ? frame : <CookiePreferencesProvider>{frame}</CookiePreferencesProvider>;
}
