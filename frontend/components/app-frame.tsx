'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ReadingProgress } from '@/components/reading-progress';

export function AppFrame({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const pathname = usePathname();
  const privateArea = /^\/(admin|newsroom)(\/|$)/.test(pathname);
  return (
    <div className={privateArea ? 'workspace-frame' : 'site-shell'}>
      {!privateArea && <ReadingProgress />}
      {children}
      {!privateArea && footer}
    </div>
  );
}
