import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { StoryCard } from '@/components/story-card';
import { NewsList } from '@/components/news-list';
import { EmptyState } from '@/components/empty-state';
import { getArticles } from '@/lib/articles';
import { newest } from '@/lib/news';
import { newsSections, sectionHref, sectionCategories, sectionTitle } from '@/lib/sections';
import { cities, cityTitle } from '@/lib/regions';
import { WatchSection } from '@/components/watch-section';
import { Reveal } from '@/components/reveal';
import { HeadlineTicker } from '@/components/headline-ticker';
import { RashifalSection } from '@/components/rashifal-section';
import { AirQualityStrip } from '@/components/air-quality-strip';
import { CricketScoreboard } from '@/components/cricket-scoreboard';
import { TrendingReels } from '@/components/trending-reels';
import { trendingReelsCategory } from '@/lib/instagram';
import { getPublicationSettings } from '@/lib/publication-api';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; view?: string }>;
}) {
  const filters = await searchParams;
  if (typeof filters.q === 'string' && filters.q.trim())
    redirect(`/search?q=${encodeURIComponent(filters.q)}`);
  if (typeof filters.category === 'string' && newsSections.some((s) => s.name === filters.category))
    redirect(sectionHref(filters.category));
  if (filters.view === 'latest') redirect('/latest');
  const [reports, settings, locale] = await Promise.all([
    getArticles(),
    getPublicationSettings(),
    getReaderLocale(),
  ]);
  const articles = newest(reports.filter(({ category }) => category !== trendingReelsCategory));
  const lead =
    articles.find((a) => a.breaking && Date.now() - Date.parse(a.publishedAt) < 86400000) ??
    articles[0];
  const remaining = articles.filter((a) => a.slug !== lead?.slug);
  const date = new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    dateStyle: 'full',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
  const desks = newsSections
    .filter(
      (s) =>
        s.name !== 'Videos' &&
        s.name !== 'Rashifal' &&
        !s.parent &&
        articles.filter((a) => sectionCategories(s).includes(a.category)).length >= 2,
    )
    .slice(0, 6);
  return (
    <>
      <SiteHeader home />
      <HeadlineTicker articles={articles} />
      <main id="main-content">
        <header className="page-heading edition-heading" id="stories">
          <div>
            <h1>{copy(locale, 'आज की बड़ी खबरें', 'Today’s headlines')}</h1>
          </div>
          <div className="edition-date">
            <span className="edition-stamp">UP24Network</span>
            <time
              dateTime={new Intl.DateTimeFormat('sv-SE', {
                dateStyle: 'short',
                timeZone: 'Asia/Kolkata',
              }).format(new Date())}
            >
              {date}
            </time>
          </div>
        </header>
        {lead ? (
          <Reveal className="front-grid">
            <StoryCard article={lead} lead />
            <aside className="briefing">
              <div className="section-heading">
                <h2>{copy(locale, 'इस वक्त', 'Now')}</h2>
                <Link href="/latest">{copy(locale, 'ताज़ा खबरें', 'Latest')}</Link>
              </div>
              <NewsList articles={remaining.slice(0, 4)} numbered />
              <div className="region-note">
                <p className="eyebrow">{copy(locale, 'आपका इलाका', 'Local')}</p>
                <div>
                  {cities.slice(0, 6).map((city) => (
                    <Link key={city.slug} href={`/city/${city.slug}`}>
                      {cityTitle(city, locale)}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </Reveal>
        ) : (
          <EmptyState />
        )}
        <Suspense fallback={null}>
          <AirQualityStrip />
        </Suspense>
        <Suspense fallback={null}>
          <CricketScoreboard locale={locale} />
        </Suspense>
        <Suspense fallback={null}>
          <TrendingReels />
        </Suspense>
        <Reveal>{settings.showVideo && <WatchSection articles={articles} />}</Reveal>
        <div className="home-reading-desk">
          {remaining.length > 0 && (
            <section className="more-stories">
              <div className="section-heading">
                <h2>{copy(locale, 'खबरें विस्तार से', 'More news')}</h2>
                <Link href="/latest">{copy(locale, 'सभी खबरें', 'All reports')}</Link>
              </div>
              <Reveal className="story-grid">
                {remaining.slice(0, 6).map((article) => (
                  <StoryCard key={article.slug} article={article} />
                ))}
              </Reveal>
            </section>
          )}
          <Suspense fallback={null}>
            {settings.showRashifal && <RashifalSection compact />}
          </Suspense>
        </div>
        {desks.map((desk) => (
          <section className="more-stories" key={desk.slug}>
            <div className="section-heading">
              <h2>{sectionTitle(desk.name, locale)}</h2>
              <Link href={sectionHref(desk.name)}>{copy(locale, 'और पढ़ें', 'View section')}</Link>
            </div>
            <div className="story-grid">
              {articles
                .filter((a) => sectionCategories(desk).includes(a.category))
                .slice(0, 3)
                .map((article) => (
                  <StoryCard key={article.slug} article={article} />
                ))}
            </div>
          </section>
        ))}
        <section className="section-directory">
          <div className="section-heading">
            <h2>{copy(locale, 'हर खबर की अपनी जगह', 'Explore news sections')}</h2>
          </div>
          <nav aria-label={copy(locale, 'खबरों के विभाग', 'News sections')}>
            {newsSections
              .filter((s) => s.name !== 'Videos')
              .map((section) => (
                <Link key={section.slug} href={sectionHref(section.name)}>
                  <span>{sectionTitle(section.name, locale)}</span>
                </Link>
              ))}
          </nav>
        </section>
      </main>
    </>
  );
}
