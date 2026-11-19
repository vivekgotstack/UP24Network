import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { StoryCard } from '@/components/story-card';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { getArticlePage } from '@/lib/articles';
import { brand } from '@/lib/brand';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getReaderLocale();
  return {
    title: copy(locale, 'वीडियो रिपोर्ट', 'Video reports'),
    description: copy(
      locale,
      'UP24Network की वीडियो खबरें और रिपोर्ट।',
      'Video news and reporting from UP24Network.',
    ),
    alternates: { canonical: '/watch' },
  };
}
export default async function Watch({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [filters, locale] = await Promise.all([searchParams, getReaderLocale()]);
  const result = await getArticlePage({ videoOnly: true, page: filters.page });
  return (
    <>
      <SiteHeader category="Videos" />
      <main id="main-content">
        <header className="page-heading watch-page-heading" id="stories">
          <div>
            <h1>{copy(locale, 'वीडियो रिपोर्ट', 'Video reports')}</h1>
            <p>
              {copy(
                locale,
                'ज़मीनी रिपोर्ट और खबरों का संदर्भ।',
                'Reporting from the ground, with context.',
              )}
            </p>
          </div>
          <a
            className="text-link"
            href={brand.youtubeChannel}
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy(locale, 'YouTube चैनल', 'YouTube channel')}
          </a>
        </header>
        {result.total ? (
          <div className="story-grid video-grid">
            {result.items.map((article) => (
              <StoryCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={copy(
              locale,
              'अभी कोई वीडियो रिपोर्ट उपलब्ध नहीं है।',
              'No video reports are available right now.',
            )}
          />
        )}
        <Pagination page={result.page} pages={result.pages} base="/watch" />
      </main>
    </>
  );
}
