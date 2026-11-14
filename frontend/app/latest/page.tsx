import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { HeadlineTicker } from '@/components/headline-ticker';
import { StoryCard } from '@/components/story-card';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { getArticlePage } from '@/lib/articles';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'ताजा खबरें',
  description: 'UP24Network की सबसे हाल में प्रकाशित रिपोर्ट।',
  alternates: { canonical: '/latest' },
};
export default async function Latest({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const results = await getArticlePage({ page: params.page });
  return (
    <>
      <SiteHeader latest />
      <HeadlineTicker articles={results.items} />
      <main id="main-content">
        <header className="page-heading" id="stories">
          <div>
            <p className="eyebrow">LATEST / NEWS DESK</p>
            <h1 lang="hi">ताजा खबरें</h1>
            <p lang="hi">सबसे नई रिपोर्ट, प्रकाशन के क्रम में।</p>
          </div>
          <span className="result-count">{results.total} reports</span>
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
