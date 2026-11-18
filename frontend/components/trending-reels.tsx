import Link from 'next/link';
import { Clapperboard } from 'lucide-react';
import { NewsImage } from '@/components/news-image';
import { getArticlePage } from '@/lib/articles';
import { canonicalReelUrl, trendingReelsCategory } from '@/lib/instagram';
import { textLanguage } from '@/lib/language';
import { sectionHref } from '@/lib/sections';
import styles from './trending-reels.module.css';

export async function TrendingReels() {
  const page = await getArticlePage({ categories: [trendingReelsCategory], size: 3 }).catch(() => null);
  const reels = page?.items.filter(({ reelUrl }) => canonicalReelUrl(reelUrl)) ?? [];
  if (!reels.length) return null;

  return (
    <section className={styles.section} aria-labelledby="trending-reels-heading">
      <div className={styles.heading}>
        <h2 id="trending-reels-heading" lang="en">Trending Reels</h2>
        <Link href={sectionHref(trendingReelsCategory)}>सभी रील्स</Link>
      </div>
      <ul className={styles.list}>
        {reels.map((reel) => (
          <li key={reel.slug}>
            <Link className={styles.card} href={`/news/${encodeURIComponent(reel.slug)}`}>
              <span className={styles.cover} aria-hidden="true">
                {reel.image && reel.image !== '/brand/up24-logo.png'
                  ? <NewsImage src={reel.image} sizes="68px" />
                  : <Clapperboard size={23} />}
              </span>
              <span className={styles.cardTitle} lang={textLanguage(reel.title)}>{reel.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
