import Link from 'next/link';
import type { Article } from '@/lib/articles';
import { textLanguage } from '@/lib/language';
import { shortDate } from '@/lib/news';
import { sectionTitle } from '@/lib/sections';

export function NewsList({
  articles,
  numbered = false,
}: {
  articles: Article[];
  numbered?: boolean;
}) {
  return (
    <div className={`news-list ${numbered ? 'news-list-numbered' : ''}`}>
      {articles.map((article, index) => (
        <article key={article.slug} className="news-list-item">
          {numbered && (
            <span className="news-list-number" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
          )}
          <div>
            <p className="eyebrow" lang="hi">
              {sectionTitle(article.category)}
            </p>
            <h3 lang={textLanguage(article.title)}>
              <Link href={`/news/${article.slug}`}>{article.title}</Link>
            </h3>
            <time dateTime={article.publishedAt}>{shortDate(article.publishedAt)}</time>
          </div>
        </article>
      ))}
    </div>
  );
}
