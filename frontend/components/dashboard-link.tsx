'use client';

import Link from 'next/link';
import { useSession } from '@/lib/session';

/** Only the authenticated employee sees their private workspace link. */
export function DashboardLink() {
  const { data }=useSession();
  if (!data?.newsroomEligible) return null;
  const admin=data.role==='ADMIN';
  return <Link href={admin ? data.newsroomAccess ? '/admin' : '/admin/sign-in'
    : data.newsroomAccess ? '/newsroom' : '/newsroom/sign-in'}>{admin ? 'Administration' : 'Newsroom'}</Link>;
}
