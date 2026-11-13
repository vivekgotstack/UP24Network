import Link from 'next/link';
import { NewsImage } from '@/components/news-image';
import { textLanguage } from '@/lib/language';
import type { ManagedArticle } from '@/lib/newsroom/types';
export function ArticlePreview({
  row,
  basePath,
}: {
  row: ManagedArticle;
  basePath: '/admin' | '/newsroom';
}) {
  return (
    <section>
      <header className="cms-section-heading">
        <div>
          <p className="eyebrow">PRIVATE EDITORIAL PREVIEW</p>
          <h2>Review the report</h2>
        </div>
        <Link className="text-link" href={`${basePath}/articles/${row.id}`}>
          Back to editor
        </Link>
      </header>
      <p className="preview-status">
        Saved {row.status.toLowerCase()} · This preview is visible only to authorized newsroom
        accounts.
      </p>
      <article className="standalone-preview">
        <p className="eyebrow">{row.article.category}</p>
        <h2 className="preview-headline" lang={textLanguage(row.article.title)}>
          {row.article.title}
        </h2>
        <p className="article-deck" lang={textLanguage(row.article.summary)}>
          {row.article.summary}
        </p>
        <div className="preview-image">
          <NewsImage
            src={row.article.image}
            alt={row.article.imageAlt}
            sizes="(max-width: 950px) 100vw, 850px"
          />
        </div>
        <div className="article-body">
          {row.article.paragraphs.map((paragraph, index) => (
            <p key={index} lang={textLanguage(paragraph)}>
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </section>
  );
}
