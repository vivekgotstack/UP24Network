import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { AuthPage } from '@/components/auth-page';
export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };
export default function SignIn() {
  return (
    <>
      <SiteHeader compact />
      <AuthPage />
    </>
  );
}
