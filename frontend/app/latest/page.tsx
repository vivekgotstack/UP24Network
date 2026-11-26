import type { Metadata } from 'next';
import { cache } from 'react';
import { SiteHeader } from '@/components/site-header';
import { StoryCard } from '@/components/story-card';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { getArticlePage } from '@/lib/articles';
import { reportCount } from '@/lib/coverage-labels';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export const dynamic = 'force-dynamic';
type LatestProps = { searchParams: Promise<{ page?: string }> };
const getLatest = cache((page?: string) => getArticlePage({ page }));

export async function generateMetadata({ searchParams }: LatestProps): Promise<Metadata> {
  const [locale, { page }] = await Promise.all([getReaderLocale(), searchParams]);
  const results = await getLatest(page);
  return {
    title: copy(locale, 'ताज़ा खबरें', 'Latest news'),
    description: copy(
      locale,
      'द मॉर्निंग एक्सप्रेस की ताज़ा खबरें, लिखित रिपोर्ट, वीडियो और रील।',
      'The latest articles, video reports and reels from The Morning Express.',
    ),
    alternates: { canonical: results.page > 1 ? `/latest?page=${results.page}` : '/latest' },
  };
}
export default async function Latest({ searchParams }: LatestProps) {
  const [params, locale] = await Promise.all([searchParams, getReaderLocale()]);
  const results = await getLatest(params.page);
  return (
    <>
      <SiteHeader latest />
      <main id="main-content" className="latest-edition">
        <header className="edition-heading" id="stories">
          <div>
            <h1>{copy(locale, 'ताज़ा खबरें', 'Latest news')}</h1>
          </div>
          <span className="result-count">{reportCount(locale, results.total)}</span>
        </header>
        {results.total ? (
          <div className="story-grid latest-grid">
            {results.items.map((article) => (
              <StoryCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
        <Pagination page={results.page} pages={results.pages} base="/latest" />
      </main>
    </>
  );
}
