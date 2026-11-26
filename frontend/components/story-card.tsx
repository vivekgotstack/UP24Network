import Link from 'next/link';
import { Instagram } from 'lucide-react';
import type { Article } from '@/lib/articles';
import { VideoPoster } from '@/components/video-poster';
import { NewsImage } from '@/components/news-image';
import { textLanguage } from '@/lib/language';
import { sectionHref, sectionTitle } from '@/lib/sections';
import { shortDate } from '@/lib/news';
import { getReaderLocale } from '@/lib/reader-locale';
import { copy } from '@/lib/locale';
import { localizeArticle } from '@/lib/article-locale';
import { isBrandPlaceholder } from '@/lib/brand';
import { canonicalReelUrl } from '@/lib/instagram';

export async function StoryCard({
  article: input,
  lead = false,
  compact = false,
  written = false,
  headingLevel = 2,
}: {
  article: Article;
  lead?: boolean;
  compact?: boolean;
  written?: boolean;
  headingLevel?: 2 | 3;
}) {
  const locale = await getReaderLocale();
  const article = localizeArticle(input, locale);
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const href = `/news/${article.slug}`;
  const reel = Boolean(canonicalReelUrl(article.reelUrl));
  const video = !reel && !written && Boolean(article.youtubeId || article.videoUrl);
  const photo = Boolean(article.image && !isBrandPlaceholder(article.image));
  return (
    <article className={`story-card ${lead ? 'lead-story' : ''} ${compact ? 'story-card-compact' : ''} ${!photo && !reel && !video ? 'story-card-text' : ''}`}>
      {(photo || reel || video) && (
        <div className={`story-image${video || reel ? ' story-image-video' : ''}`}>
          {video ? (
            <VideoPoster slug={article.slug} title={article.title} image={article.image} />
          ) : (
            <Link href={href} tabIndex={-1} aria-hidden="true" className="image-link">
              {reel && !photo ? (
                <span className="reel-poster"><Instagram size={32} /></span>
              ) : (
                <NewsImage
                  src={article.image}
                  priority={lead}
                  sizes={compact ? '128px' : lead ? '(max-width: 760px) 100vw, 750px' : undefined}
                />
              )}
            </Link>
          )}
        </div>
      )}
      <div className="story-copy">
        <p className="story-category">
          <Link href={sectionHref(article.category)}>{sectionTitle(article.category, locale)}</Link>
          {article.breaking && (
            <span className="breaking-label">{copy(locale, 'ब्रेकिंग', 'Breaking')}</span>
          )}
        </p>
        <Heading className="story-headline" lang={textLanguage(article.title)}>
          <Link href={href}>{article.title}</Link>
        </Heading>
        {lead && (
          <p className="story-summary" lang={textLanguage(article.summary)}>
            {article.summary}
          </p>
        )}
        <div className="story-meta">
          <time dateTime={article.publishedAt}>{shortDate(article.publishedAt, locale)}</time>
          <span>
            {reel
              ? copy(locale, 'इंस्टाग्राम रील', 'Instagram Reel')
              : video
                ? copy(locale, 'वीडियो रिपोर्ट', 'Video report')
                : copy(locale, `${article.readingMinutes} मिनट`, `${article.readingMinutes} min read`)}
          </span>
        </div>
      </div>
    </article>
  );
}
