import Link from 'next/link';
import type { Article } from '@/lib/articles';
import { VideoPoster } from '@/components/video-poster';
import { NewsImage } from '@/components/news-image';
import { CoverImage } from '@/components/cover-image';
import { textLanguage } from '@/lib/language';
import { sectionHref, sectionTitle } from '@/lib/sections';
import { shortDate } from '@/lib/news';

export function StoryCard({ article, lead = false }: { article: Article; lead?: boolean }) {
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
          <Link href={sectionHref(article.category)} lang="hi">
            {sectionTitle(article.category)}
          </Link>
          {article.breaking && <span className="breaking-label">Breaking</span>}
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
          <time dateTime={article.publishedAt}>{shortDate(article.publishedAt)}</time>
          <span>
            {article.youtubeId || article.videoUrl
              ? 'Video report'
              : `${article.readingMinutes} min read`}
          </span>
        </div>
      </div>
    </article>
  );
}
