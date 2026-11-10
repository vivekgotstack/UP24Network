import Link from 'next/link';
import type { Article } from '@/lib/articles';

export function HeadlineTicker({ articles }: { articles: Article[] }) {
  const recentBreaking = articles.filter(article => article.breaking && Date.now() - new Date(article.publishedAt).getTime() < 86400000);
  const headlines = (recentBreaking.length ? recentBreaking : articles).slice(0, 6);
  if (!headlines.length) return null;
  return <section className="headline-ticker" aria-label={recentBreaking.length ? 'Breaking news headlines' : 'Latest headlines'}>
    <strong>{recentBreaking.length ? 'Breaking news' : 'Latest'}</strong>
    <div className="ticker-window"><div className="ticker-track">{[0, 1].map(copy => <div className="ticker-copy" key={copy} aria-hidden={copy === 1}>
      {headlines.map(article => <Link key={article.slug} tabIndex={copy === 1 ? -1 : 0} href={`/news/${article.slug}`}>{article.title}</Link>)}
    </div>)}</div></div>
  </section>;
}
