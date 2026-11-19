import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { AccountConsole } from '@/components/account-console';
import { getReaderLocale } from '@/lib/reader-locale';
import { copy } from '@/lib/locale';
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: copy(await getReaderLocale(), 'आपका खाता', 'Your account'),
    robots: { index: false, follow: false },
  };
}
export default async function AccountPage() {
  return (
    <>
      <SiteHeader compact />
      <main id="main-content">
        <AccountConsole locale={await getReaderLocale()} />
      </main>
    </>
  );
}
