import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { StoryCard } from '@/components/story-card';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { getArticlePage } from '@/lib/articles';
import { brand } from '@/lib/brand';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'वीडियो रिपोर्ट',
  description: 'UP24Network की वीडियो खबरें और रिपोर्ट।',
  alternates: { canonical: '/watch' },
};
export default async function Watch({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const filters = await searchParams;
  const result = await getArticlePage({ videoOnly: true, page: filters.page });
  return (
    <>
      <SiteHeader category="Videos" />
      <main id="main-content">
        <header className="page-heading watch-page-heading" id="stories">
          <div>
            <p className="eyebrow">THE VIDEO DESK</p>
            <h1 lang="hi">देखिए। समझिए।</h1>
            <p lang="hi">जमीनी रिपोर्ट और खबरों का पूरा संदर्भ।</p>
          </div>
          <a
            className="text-link"
            href={brand.youtubeChannel}
            target="_blank"
            rel="noopener noreferrer"
          >
            Official YouTube channel
          </a>
        </header>
        {result.total ? (
          <div className="story-grid video-grid">
            {result.items.map((article) => (
              <StoryCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState title="इस समय कोई वीडियो रिपोर्ट उपलब्ध नहीं है।" />
        )}
        <Pagination page={result.page} pages={result.pages} base="/watch" />
      </main>
    </>
  );
}
