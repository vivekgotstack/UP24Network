'use client';

import Link from 'next/link';
import { useSession } from '@/lib/session';
import { copy, type SiteLocale } from '@/lib/locale';

/** Only the authenticated employee sees their private workspace link. */
export function DashboardLink({ locale = 'hi' }: { locale?: SiteLocale }) {
  const { data } = useSession();
  if (!data?.newsroomEligible) return null;
  const admin = data.role === 'ADMIN';
  const workspace = admin ? '/admin' : '/newsroom';
  return (
    <Link href={data.newsroomAccess ? workspace : `${workspace}/sign-in`}>
      {admin ? copy(locale, 'प्रशासन', 'Administration') : copy(locale, 'न्यूज़रूम', 'Newsroom')}
    </Link>
  );
}
