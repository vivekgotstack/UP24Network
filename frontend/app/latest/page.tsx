import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { HeadlineTicker } from '@/components/headline-ticker';
import { StoryCard } from '@/components/story-card';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { getArticlePage } from '@/lib/articles';
import { reportCount } from '@/lib/coverage-labels';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getReaderLocale();
  return {
    title: copy(locale, 'ताज़ा खबरें', 'Latest news'),
    description: copy(
      locale,
      'TheMorningExpress की सबसे हाल में प्रकाशित रिपोर्ट।',
      'The latest reports from TheMorningExpress.',
    ),
    alternates: { canonical: '/latest' },
  };
}
export default async function Latest({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [params, locale] = await Promise.all([searchParams, getReaderLocale()]);
  const results = await getArticlePage({ page: params.page });
  return (
    <>
      <SiteHeader latest />
      <HeadlineTicker articles={results.items} />
      <main id="main-content">
        <header className="page-heading" id="stories">
          <div>
            <h1>{copy(locale, 'ताज़ा खबरें', 'Latest news')}</h1>
            <p>
              {copy(
                locale,
                'सबसे नई रिपोर्ट, प्रकाशन के क्रम में।',
                'The latest reports, in publication order.',
              )}
            </p>
          </div>
          <span className="result-count">{reportCount(locale, results.total)}</span>
        </header>
        {results.total ? (
          <div className="story-grid">
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
