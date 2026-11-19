import Link from 'next/link';
import type { Article } from '@/lib/articles';
import { VideoPoster } from '@/components/video-poster';
import { NewsImage } from '@/components/news-image';
import { CoverImage } from '@/components/cover-image';
import { textLanguage } from '@/lib/language';
import { sectionHref, sectionTitle } from '@/lib/sections';
import { shortDate } from '@/lib/news';
import { getReaderLocale } from '@/lib/reader-locale';
import { copy } from '@/lib/locale';
import { localizeArticle } from '@/lib/article-locale';

export async function StoryCard({
  article: input,
  lead = false,
}: {
  article: Article;
  lead?: boolean;
}) {
  const locale = await getReaderLocale();
  const article = localizeArticle(input, locale);
  return (
    <article className={`story-card ${lead ? 'lead-story' : ''}`}>
      <div className="story-image">
        {article.youtubeId || article.videoUrl ? (
          <VideoPoster slug={article.slug} title={article.title} image={article.image} />
        ) : (
          <Link
            href={`/news/${article.slug}`}
            tabIndex={-1}
            aria-hidden="true"
            className="image-link"
          >
            {lead ? <CoverImage src={article.image} /> : <NewsImage src={article.image} />}
          </Link>
        )}
      </div>
      <div className="story-copy">
        <p className="story-category">
          <Link href={sectionHref(article.category)}>{sectionTitle(article.category, locale)}</Link>
          {article.breaking && (
            <span className="breaking-label">{copy(locale, 'ब्रेकिंग', 'Breaking')}</span>
          )}
        </p>
        <h2 lang={textLanguage(article.title)}>
          <Link href={`/news/${article.slug}`}>{article.title}</Link>
        </h2>
        {lead && (
          <p className="story-summary" lang={textLanguage(article.summary)}>
            {article.summary}
          </p>
        )}
        <div className="story-meta">
          <time dateTime={article.publishedAt}>{shortDate(article.publishedAt, locale)}</time>
          <span>
            {article.youtubeId || article.videoUrl
              ? copy(locale, 'वीडियो रिपोर्ट', 'Video report')
              : copy(
                  locale,
                  `${article.readingMinutes} मिनट`,
                  `${article.readingMinutes} min read`,
                )}
          </span>
        </div>
      </div>
    </article>
  );
}
