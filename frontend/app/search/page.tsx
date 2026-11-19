import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { StoryCard } from '@/components/story-card';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { SearchCategoryPicker } from '@/components/search-category-picker';
import { getArticlePage } from '@/lib/articles';
import { newsSections, sectionCategories, sectionTitle } from '@/lib/sections';
import { reportCount } from '@/lib/coverage-labels';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getReaderLocale();
  return { title: copy(locale, 'खोज', 'Search'), robots: { index: false, follow: true } };
}
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const [params, locale] = await Promise.all([searchParams, getReaderLocale()]);
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 120) : '';
  const category = newsSections.some((s) => s.name === params.category) ? params.category! : '';
  const section = newsSections.find((item) => item.name === category);
  const results = await getArticlePage({
    q: query,
    categories: section && category !== 'Videos' ? sectionCategories(section) : [],
    videoOnly: category === 'Videos',
    page: params.page,
  });
  const base = `/search?q=${encodeURIComponent(query)}${category ? `&category=${encodeURIComponent(category)}` : ''}`;
  return (
    <>
      <SiteHeader compact />
      <main id="main-content">
        <header className="page-heading" id="stories">
          <div>
            <h1>{copy(locale, 'खबर खोजें', 'Search reports')}</h1>
          </div>
        </header>
        <form role="search" action="/search" className="search-page-form search-full">
          <label className="sr-only" htmlFor="search-query">
            {copy(locale, 'खबर, विषय या शहर', 'Headline, topic or city')}
          </label>
          <input
            id="search-query"
            name="q"
            type="search"
            placeholder={copy(locale, 'खबर, विषय या शहर', 'Headline, topic or city')}
            defaultValue={query}
            maxLength={120}
          />
          <SearchCategoryPicker
            key={category}
            category={category}
            label={copy(locale, 'समाचार विभाग', 'News section')}
            allLabel={copy(locale, 'सभी विभाग', 'All sections')}
            options={newsSections.map(({ name }) => ({ value: name, label: sectionTitle(name, locale) }))}
          />
          <Button type="submit">{copy(locale, 'खोजें', 'Search')}</Button>
        </form>
        <p className="search-result-note" role="status">
          {query
            ? copy(
                locale,
                `“${query}” के लिए ${reportCount(locale, results.total)}`,
                `${reportCount(locale, results.total)} matching “${query}”`,
              )
            : reportCount(locale, results.total)}
        </p>
        {results.total ? (
          <div className="story-grid">
            {results.items.map((article) => (
              <StoryCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={copy(locale, 'कोई खबर नहीं मिली।', 'No matching reports.')}
            description={copy(
              locale,
              'कोई दूसरा विषय या शहर खोजें।',
              'Try a different topic or city.',
            )}
            search
          />
        )}
        <Pagination page={results.page} pages={results.pages} base={base} />
      </main>
    </>
  );
}
