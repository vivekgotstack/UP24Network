import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { AuthPage } from '@/components/auth-page';
export const metadata: Metadata = {
  title: 'Create an account',
  robots: { index: false, follow: false },
};
export default function Register() {
  return (
    <>
      <SiteHeader compact />
      <AuthPage signup />
    </>
  );
}
