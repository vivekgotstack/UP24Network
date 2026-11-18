import Link from 'next/link';
import { Camera } from 'lucide-react';
import type { Article } from '@/lib/articles';
import { brand } from '@/lib/brand';
import { textLanguage } from '@/lib/language';

const instagram = brand.socials.find(({ name }) => name === 'Instagram');

export function HeadlineTicker({ articles }: { articles: Article[] }) {
  const recentBreaking = articles.filter(
    (article) =>
      article.breaking && Date.now() - new Date(article.publishedAt).getTime() < 86400000,
  );
  const headlines = (recentBreaking.length ? recentBreaking : articles).slice(0, 6);
  if (!headlines.length) return null;
  return (
    <section
      className="headline-ticker"
      aria-label={recentBreaking.length ? 'Breaking news headlines' : 'Latest headlines'}
    >
      <strong>{recentBreaking.length ? 'Breaking news' : 'Latest'}</strong>
      <div className="ticker-window">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div className="ticker-copy" key={copy} aria-hidden={copy === 1}>
              {headlines.map((article) => (
                <Link
                  key={article.slug}
                  lang={textLanguage(article.title)}
                  tabIndex={copy === 1 ? -1 : 0}
                  href={`/news/${article.slug}`}
                >
                  {article.title}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      {instagram && (
        <a
          className="ticker-follow"
          href={instagram.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow UP24Network on Instagram"
        >
          <Camera size={15} aria-hidden="true" />
          <span>Follow us</span>
        </a>
      )}
    </section>
  );
}
