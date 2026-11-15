import { SessionRenewal } from '@/components/session-renewal';

export const metadata = { title: 'Restoring sign-in', robots: { index: false, follow: false } };

export default async function RenewPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination =
    next && /^\/(admin|newsroom)(\/|$)/.test(next) && !/[\\\r\n]/.test(next) ? next : '/account';
  const signIn = destination.startsWith('/admin')
    ? '/admin/sign-in'
    : destination.startsWith('/newsroom')
      ? '/newsroom/sign-in'
      : '/account/sign-in';
  return <SessionRenewal destination={destination} signIn={signIn} />;
}
