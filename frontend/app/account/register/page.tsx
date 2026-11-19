import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { AuthPage } from '@/components/auth-page';
import { getReaderLocale } from '@/lib/reader-locale';
import { copy } from '@/lib/locale';
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: copy(await getReaderLocale(), 'खाता बनाएँ', 'Create an account'),
    robots: { index: false, follow: false },
  };
}
export default async function Register() {
  return (
    <>
      <SiteHeader compact />
      <AuthPage signup locale={await getReaderLocale()} />
    </>
  );
}
