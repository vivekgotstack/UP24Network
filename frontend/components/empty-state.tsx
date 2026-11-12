import Link from 'next/link';

export function EmptyState({
  title = 'इस समय कोई खबर उपलब्ध नहीं है।',
  description = 'नई रिपोर्ट प्रकाशित होने पर यहाँ दिखाई देगी।',
  search = false,
}: {
  title?: string;
  description?: string;
  search?: boolean;
}) {
  return (
    <section className="empty-state">
      <span className="empty-mark" aria-hidden="true" />
      <h2 lang="hi">{title}</h2>
      <p lang="hi">{description}</p>
      <div className="empty-actions">
        <Link className="text-link" href="/latest">
          Read latest news
        </Link>
        {search && (
          <Link className="text-link" href="/search">
            Clear search
          </Link>
        )}
      </div>
    </section>
  );
}
