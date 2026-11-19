import Link from 'next/link';
import { Clapperboard } from 'lucide-react';
import { localizeArticle } from '@/lib/article-locale';
import { getArticlePage } from '@/lib/articles';
import { canonicalReelUrl, trendingReelsCategory } from '@/lib/instagram';
import { textLanguage } from '@/lib/language';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import { sectionHref } from '@/lib/sections';
import styles from './trending-reels.module.css';

export async function TrendingReels() {
  const [page, locale] = await Promise.all([
    getArticlePage({ categories: [trendingReelsCategory], size: 3 }).catch(() => null),
    getReaderLocale(),
  ]);
  const reels =
    page?.items
      .filter(({ reelUrl }) => canonicalReelUrl(reelUrl))
      .map((article) => localizeArticle(article, locale)) ?? [];
  if (!reels.length) return null;

  return (
    <section className={styles.section} aria-labelledby="trending-reels-heading">
      <div className={styles.heading}>
        <h2 id="trending-reels-heading">{copy(locale, 'ट्रेंडिंग रील्स', 'Trending Reels')}</h2>
        <Link href={sectionHref(trendingReelsCategory)}>
          {copy(locale, 'सभी रील्स', 'All reels')}
        </Link>
      </div>
      <ul className={styles.list}>
        {reels.map((reel) => (
          <li key={reel.slug}>
            <Link className={styles.card} href={`/news/${encodeURIComponent(reel.slug)}`}>
              <span className={styles.cover} aria-hidden="true">
                <Clapperboard size={23} />
              </span>
              <span className={styles.cardText}>
                <strong className={styles.cardTitle} lang={textLanguage(reel.title)}>
                  {reel.title}
                </strong>
                <span className={styles.cardIntro} lang={textLanguage(reel.summary)}>
                  {reel.summary}
                </span>
                <span className={styles.credit}>
                  {copy(locale, 'चयन', 'Curated by')}{' '}
                  <span lang={textLanguage(reel.author)}>{reel.author}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
