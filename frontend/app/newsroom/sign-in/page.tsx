import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth-page';
export const metadata: Metadata = {
  title: 'Staff sign in',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AuthPage editorial workspace="staff" />;
}
