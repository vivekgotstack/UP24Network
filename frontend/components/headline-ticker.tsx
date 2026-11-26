import Link from 'next/link';
import { SocialIcon } from '@/components/social-icon';
import type { Article } from '@/lib/articles';
import { brand } from '@/lib/brand';
import { getPublicationChannels } from '@/lib/publication-channels';
import { textLanguage } from '@/lib/language';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import { localizeArticle } from '@/lib/article-locale';

export async function HeadlineTicker({ articles }: { articles: Article[] }) {
  const locale = await getReaderLocale();
  const recentBreaking = articles.filter(
    (article) =>
      article.breaking && Date.now() - new Date(article.publishedAt).getTime() < 86400000,
  );
  const headlines = (recentBreaking.length ? recentBreaking : articles)
    .slice(0, 6)
    .map((article) => localizeArticle(article, locale));
  if (!headlines.length) return null;
  const channels = getPublicationChannels();
  return (
    <section className="headline-ticker" aria-label={copy(locale, 'मुख्य खबरें', 'Headlines')}>
      <strong>
        {recentBreaking.length ? copy(locale, 'ब्रेकिंग', 'Breaking') : copy(locale, 'ताज़ा', 'Latest')}
      </strong>
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
      {channels.length > 0 && <nav
        className="ticker-follow"
        aria-label={copy(locale, `${brand.name} को फ़ॉलो करें`, `Follow ${brand.name}`)}
      >
        <span>{copy(locale, 'फ़ॉलो करें', 'Follow us')}</span>
        {channels.map((social) => (
          <a
            key={social.name}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={copy(
              locale,
              `${social.name} पर ${brand.name} को फ़ॉलो करें`,
              `Follow ${brand.name} on ${social.name}`,
            )}
            title={social.name}
          >
            <SocialIcon name={social.name} />
          </a>
        ))}
      </nav>}
    </section>
  );
}
