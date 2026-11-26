import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { StoryCard } from '@/components/story-card';
import { getArticlePage } from '@/lib/articles';
import { newsSections, sectionHref, sectionCategories, sectionTitle } from '@/lib/sections';
import { cities, cityTitle } from '@/lib/regions';
import { RashifalSection } from '@/components/rashifal-section';
import { AirQualityStrip } from '@/components/air-quality-strip';
import { CricketScoreboard } from '@/components/cricket-scoreboard';
import { TrendingReels } from '@/components/trending-reels';
import { getPublicationSettings } from '@/lib/publication-api';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import { brand } from '@/lib/brand';
import { getPublicationChannels } from '@/lib/publication-channels';

export const dynamic = 'force-dynamic';
const origin = process.env.SITE_URL ?? 'http://127.0.0.1:3000';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getReaderLocale();
  const title = copy(locale, 'यूपी न्यूज़ और उत्तर प्रदेश की ताज़ा खबरें', 'UP News and Latest Uttar Pradesh Headlines');
  const description = copy(
    locale,
    'लखनऊ, कानपुर, वाराणसी, प्रयागराज और उत्तर प्रदेश के अन्य शहरों से ताज़ा खबरें, स्थानीय रिपोर्ट और वीडियो।',
    'Get the latest Uttar Pradesh news, local reporting and video coverage from Lucknow, Kanpur, Varanasi, Prayagraj and across UP.',
  );
  return {
    title: { absolute: `${title} | ${brand.displayName}` },
    description,
    alternates: { canonical: '/' },
    openGraph: { type: 'website', title, description, url: '/', siteName: brand.displayName, locale: locale === 'hi' ? 'hi_IN' : 'en_IN' },
  };
}

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
  const publicationSettings = getPublicationSettings();
  const [written, settings, locale, requestHeaders, videos] = await Promise.all([
    getArticlePage({ writtenOnly: true, size: 48 }),
    publicationSettings,
    getReaderLocale(),
    headers(),
    publicationSettings.then(async ({ showVideo }) => showVideo ? (await getArticlePage({ categories: ['Videos'], videoOnly: true, size: 3 })).items : []),
  ]);
  const [lead, ...remaining] = written.items;
  const deskReports = remaining.slice(5);
  const now = new Date();
  const date = new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    dateStyle: 'full',
    timeZone: 'Asia/Kolkata',
  }).format(now);
  const desks = newsSections
    .filter((section) => !section.parent && !['Videos', 'Rashifal'].includes(section.name))
    .map((section) => ({
      ...section,
      reports: deskReports.filter((article) => sectionCategories(section).includes(article.category)).slice(0, 3),
    }))
    .filter(({ reports }) => reports.length >= 2)
    .slice(0, 4);
  const home = new URL('/', origin).href;
  const publisher = `${home}#publisher`;
  const channels = getPublicationChannels().map(({ url }) => url);
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${home}#website`, url: home, name: brand.displayName, alternateName: brand.name, publisher: { '@id': publisher } },
      { '@type': 'NewsMediaOrganization', '@id': publisher, url: home, name: brand.displayName, alternateName: brand.name, logo: new URL(brand.logoPath, home).href, sameAs: channels.length ? channels : undefined },
    ],
  };
  return (
    <>
      <SiteHeader home />
      <main id="main-content" className="news-home">
        <header className="edition-heading" id="stories">
          <h1>{copy(locale, 'उत्तर प्रदेश की ताज़ा खबरें', 'Uttar Pradesh news')}</h1>
          <time dateTime={new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeZone: 'Asia/Kolkata' }).format(now)}>{date}</time>
        </header>
        {lead ? (
          <div className={`edition-grid${remaining.length ? '' : ' edition-grid-single'}`}>
            <StoryCard article={lead} lead written />
            {remaining.length > 0 && (
              <section className="edition-rail" aria-labelledby="recent-articles">
                <div className="section-heading">
                  <h2 id="recent-articles">{copy(locale, 'हाल की रिपोर्ट', 'Recent articles')}</h2>
                </div>
                {remaining.slice(0, 5).map((article) => (
                  <StoryCard key={article.slug} article={article} compact written headingLevel={3} />
                ))}
              </section>
            )}
          </div>
        ) : (
          <section className="edition-empty">
            <h2>{copy(locale, 'अभी कोई लिखित रिपोर्ट उपलब्ध नहीं है', 'Written reports will appear here as they’re published')}</h2>
            <Link className="text-link" href="/latest">{copy(locale, 'ताज़ा खबरें देखें', 'Browse latest updates')}</Link>
          </section>
        )}
        <nav className="edition-cities" aria-label={copy(locale, 'उत्तर प्रदेश के शहर', 'Uttar Pradesh cities')}>
          <strong>{copy(locale, 'शहरों की खबरें', 'City news')}</strong>
          {cities.slice(0, 8).map((city) => (
            <Link key={city.slug} href={`/city/${city.slug}`}>{cityTitle(city, locale)}</Link>
          ))}
          <Link className="edition-all-cities" href="/region/uttar-pradesh">{copy(locale, 'उत्तर प्रदेश की सभी खबरें', 'All UP coverage')} <span aria-hidden="true">→</span></Link>
        </nav>
        {desks.map((desk) => (
          <section className="more-stories" key={desk.slug}>
            <div className="section-heading">
              <h2>{sectionTitle(desk.name, locale)}</h2>
              <Link href={sectionHref(desk.name)}>{copy(locale, 'और पढ़ें', 'View section')}</Link>
            </div>
            <div className="story-grid">
              {desk.reports.map((article) => (
                <StoryCard key={article.slug} article={article} written headingLevel={3} />
              ))}
            </div>
          </section>
        ))}
        {videos.length > 0 && (
          <section className="more-stories edition-videos" aria-labelledby="edition-videos">
            <div className="section-heading">
              <h2 id="edition-videos">{copy(locale, 'वीडियो रिपोर्ट', 'Video reports')}</h2>
              <Link href="/watch">{copy(locale, 'सभी वीडियो', 'All videos')} <span aria-hidden="true">→</span></Link>
            </div>
            <div className="story-grid">
              {videos.map((article) => <StoryCard key={article.slug} article={article} headingLevel={3} />)}
            </div>
          </section>
        )}
        <Suspense fallback={null}>
          <AirQualityStrip />
        </Suspense>
        {settings.showCricketScores !== false && <CricketScoreboard locale={locale} />}
        <Suspense fallback={null}>
          <TrendingReels />
        </Suspense>
        <Suspense fallback={null}>
          {settings.showRashifal && <RashifalSection compact />}
        </Suspense>
        <section className="section-directory">
          <div className="section-heading">
            <h2>{copy(locale, 'समाचार विभाग', 'News sections')}</h2>
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
      <script type="application/ld+json" nonce={requestHeaders.get('x-nonce') ?? undefined} dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    </>
  );
}
