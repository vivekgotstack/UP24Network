import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { AccountConsole } from '@/components/account-console';
export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};
export default function AccountPage() {
  return (
    <>
      <SiteHeader compact />
      <main id="main-content">
        <AccountConsole />
      </main>
    </>
  );
}
