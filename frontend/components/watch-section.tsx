import Link from 'next/link';
import { VideoPoster } from '@/components/video-poster';
import { textLanguage } from '@/lib/language';
import { hasVideo, newest } from '@/lib/news';
import type { Article } from '@/lib/articles';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import { localizeArticle } from '@/lib/article-locale';

export async function WatchSection({ articles }: { articles: Article[] }) {
  const locale = await getReaderLocale();
  const videos = newest(articles).filter(hasVideo).slice(0, 3).map((article) => localizeArticle(article, locale));
  if (!videos.length) return null;
  const [lead, ...rest] = videos;
  return (
    <section className="watch-section" id="watch" aria-labelledby="watch-title">
      <div className="watch-heading">
        <div>
          <h2 id="watch-title">
            {copy(locale, 'वीडियो खबरें', 'Video reports')}
          </h2>
        </div>
        <Link href="/watch" className="text-link">
          {copy(locale, 'सभी वीडियो', 'All videos')}
        </Link>
      </div>
      <div className="watch-layout">
        <div className="watch-feature">
          <div className="watch-screen">
            <VideoPoster slug={lead.slug} title={lead.title} image={lead.image} />
          </div>
          <h3 lang={textLanguage(lead.title)}>
            <Link href={`/news/${lead.slug}`}>{lead.title}</Link>
          </h3>
        </div>
        <div className="watch-queue">
          {rest.map((article) => (
            <article key={article.slug}>
              <span className="eyebrow">{copy(locale, 'वीडियो', 'Video')}</span>
              <h3 lang={textLanguage(article.title)}>
                <Link href={`/news/${article.slug}`}>{article.title}</Link>
              </h3>
              <Link className="text-link" href={`/news/${article.slug}`}>
                {copy(locale, 'देखें', 'Watch')}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
