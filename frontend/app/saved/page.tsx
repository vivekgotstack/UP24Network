import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SavedStories } from '@/components/saved-stories';
import { getReaderLocale } from '@/lib/reader-locale';
import { copy } from '@/lib/locale';
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: copy(await getReaderLocale(), 'सहेजी हुई खबरें', 'Saved stories'),
    robots: { index: false, follow: false },
  };
}
export default async function SavedPage() {
  const locale = await getReaderLocale();
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" className="saved-page">
        <header className="page-heading">
          <div>
            <h1>{copy(locale, 'पढ़ने की सूची', 'Reading list')}</h1>
          </div>
        </header>
        <SavedStories locale={locale} />
      </main>
    </>
  );
}
