import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { StoryCard } from '@/components/story-card';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { getArticles } from '@/lib/articles';
import { newsSections } from '@/lib/sections';
import { searchStories, pageOf } from '@/lib/news';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } };
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const [params, articles] = await Promise.all([searchParams, getArticles()]);
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 120) : '';
  const category = newsSections.some((s) => s.name === params.category) ? params.category! : '';
  const results = pageOf(searchStories(articles, query, category), params.page);
  const base = `/search?q=${encodeURIComponent(query)}${category ? `&category=${encodeURIComponent(category)}` : ''}`;
  return (
    <>
      <SiteHeader compact />
      <main id="main-content">
        <header className="page-heading" id="stories">
          <div>
            <p className="eyebrow">SEARCH THE NEWSROOM</p>
            <h1 lang="hi">खबर तलाशिए</h1>
          </div>
        </header>
        <form role="search" action="/search" className="search-page-form search-full">
          <label className="sr-only" htmlFor="search-query">
            Headline, topic or city
          </label>
          <input
            id="search-query"
            name="q"
            type="search"
            placeholder="खबर, विषय या शहर"
            defaultValue={query}
            maxLength={120}
          />
          <label className="sr-only" htmlFor="search-category">
            News section
          </label>
          <select id="search-category" name="category" defaultValue={category}>
            <option value="">All sections</option>
            {newsSections.map((s) => (
              <option key={s.slug} value={s.name}>
                {s.title}
              </option>
            ))}
          </select>
          <Button type="submit">Search</Button>
        </form>
        <p className="search-result-note" role="status">
          {results.total} reports{query ? ` matching “${query}”` : ' in the current news library'}
        </p>
        {results.total ? (
          <div className="story-grid">
            {results.items.map((article) => (
              <StoryCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="इस खोज से कोई खबर नहीं मिली।"
            description="विषय या शहर का कोई दूसरा नाम आजमाइए।"
            search
          />
        )}
        <Pagination page={results.page} pages={results.pages} base={base} />
      </main>
    </>
  );
}
