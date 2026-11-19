import type { ArticlePage } from '@/lib/articles';
import { StoryCard } from '@/components/story-card';
import { NewsList } from '@/components/news-list';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export async function CoverageFeed({ result, base }: { result: ArticlePage; base: string }) {
  const locale = await getReaderLocale();
  const [lead, ...remaining] = result.items;
  const feature = result.page === 1 && lead;
  const grid = feature ? remaining.slice(3) : result.items;
  return (
    <>
      {feature && (
        <div className="coverage-lead">
          <StoryCard article={lead} lead />
          {remaining.length > 0 && (
            <div className="coverage-briefs">
              <p className="eyebrow">{copy(locale, 'और खबरें', 'More news')}</p>
              <NewsList articles={remaining.slice(0, 3)} />
            </div>
          )}
        </div>
      )}
      {grid.length > 0 && (
        <div className="coverage-grid">
          {grid.map((article) => (
            <StoryCard key={article.slug} article={article} />
          ))}
        </div>
      )}
      {!result.total && <EmptyState />}
      <Pagination page={result.page} pages={result.pages} base={base} />
    </>
  );
}
