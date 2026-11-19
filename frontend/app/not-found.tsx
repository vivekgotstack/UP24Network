import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export default async function NotFound() {
  const locale = await getReaderLocale();
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" className="empty-state">
        <h1>{copy(locale, 'पृष्ठ नहीं मिला', 'Page not found')}</h1>
        <p>
          {copy(
            locale,
            'खबर का पता बदल गया होगा या लिंक गलत हो सकता है।',
            'The report may have moved, or the link may be incorrect.',
          )}
        </p>
        <div className="empty-actions">
          <Link className="text-link" href="/">
            {copy(locale, 'मुख्य पृष्ठ', 'Home')}
          </Link>
          <Link className="text-link" href="/search">
            {copy(locale, 'खबर खोजें', 'Search reports')}
          </Link>
        </div>
      </main>
    </>
  );
}
