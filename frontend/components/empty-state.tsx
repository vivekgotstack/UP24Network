import Link from 'next/link';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import { textLanguage } from '@/lib/language';

export async function EmptyState({
  title,
  description,
  search = false,
}: {
  title?: string;
  description?: string;
  search?: boolean;
}) {
  const locale = await getReaderLocale();
  const heading = title ?? copy(locale, 'अभी कोई खबर उपलब्ध नहीं है।', 'No reports available.');
  const detail =
    description ?? copy(locale, 'नई खबरें यहाँ दिखाई देंगी।', 'New reports will appear here.');
  return (
    <section className="empty-state">
      <span className="empty-mark" aria-hidden="true" />
      <h2 lang={textLanguage(heading)}>{heading}</h2>
      <p lang={textLanguage(detail)}>{detail}</p>
      <div className="empty-actions">
        <Link className="text-link" href="/latest">
          {copy(locale, 'ताज़ा खबरें', 'Latest news')}
        </Link>
        {search && (
          <Link className="text-link" href="/search">
            {copy(locale, 'खोज हटाएँ', 'Clear search')}
          </Link>
        )}
      </div>
    </section>
  );
}
