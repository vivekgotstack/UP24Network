import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { PasswordRecoveryPanel } from '@/components/password-recovery-panel';
import { getReaderLocale } from '@/lib/reader-locale';
import { copy } from '@/lib/locale';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: copy(await getReaderLocale(), 'खाता वापस खोलें', 'Recover your account'),
    robots: { index: false, follow: false },
  };
}
export default async function RecoverAccount() {
  const locale = await getReaderLocale();
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" lang={locale}>
        <PasswordRecoveryPanel locale={locale} />
      </main>
    </>
  );
}
