import Link from 'next/link';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export async function Pagination({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const locale = await getReaderLocale();
  const previous = copy(locale, 'पिछला', 'Previous');
  const next = copy(locale, 'अगला', 'Next');
  const href = (value: number) => `${base}${base.includes('?') ? '&' : '?'}page=${value}#stories`;
  return (
    <nav className="pagination" aria-label={copy(locale, 'खबरों के पृष्ठ', 'News pages')}>
      {page > 1 ? (
        <Link href={href(page - 1)}>{previous}</Link>
      ) : (
        <span aria-disabled="true">{previous}</span>
      )}
      <span>
        {copy(locale, `पृष्ठ ${page} / ${pages}`, `Page ${page} of ${pages}`)}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)}>{next}</Link>
      ) : (
        <span aria-disabled="true">{next}</span>
      )}
    </nav>
  );
}
