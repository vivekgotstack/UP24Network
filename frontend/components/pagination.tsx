import Link from 'next/link';

export function Pagination({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const href = (value: number) => `${base}${base.includes('?') ? '&' : '?'}page=${value}#stories`;
  return (
    <nav className="pagination" aria-label="News pages">
      {page > 1 ? (
        <Link href={href(page - 1)}>Previous</Link>
      ) : (
        <span aria-disabled="true">Previous</span>
      )}
      <span>
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)}>Next</Link>
      ) : (
        <span aria-disabled="true">Next</span>
      )}
    </nav>
  );
}
