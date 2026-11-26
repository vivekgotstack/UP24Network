import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { CoverageFeed } from '@/components/coverage-feed';
import { CoverageRail } from '@/components/coverage-rail';
import { getArticlePage } from '@/lib/articles';
import { cities, cityTitle, regions, regionCities, regionTitle } from '@/lib/regions';
import { reportCount } from '@/lib/coverage-labels';
import { copy, type SiteLocale } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

type Kind = 'city' | 'region';
function placeFor(kind: Kind, slug: string) {
  return kind === 'city'
    ? cities.find((city) => city.slug === slug)
    : regions.find((region) => region.slug === slug);
}
function placeLabel(place: NonNullable<ReturnType<typeof placeFor>>, locale: SiteLocale) {
  return 'aliases' in place ? cityTitle(place, locale) : regionTitle(place, locale);
}
export async function placeMetadata(kind: Kind, slug: string): Promise<Metadata> {
  const locale = await getReaderLocale();
  const place = placeFor(kind, slug);
  const label = place ? placeLabel(place, locale) : '';
  if (kind === 'region' && slug === 'uttar-pradesh') {
    return {
      title: copy(locale, 'उत्तर प्रदेश समाचार · ताज़ा यूपी न्यूज़', 'Uttar Pradesh News · Local UP News'),
      description: copy(locale, 'लखनऊ, कानपुर, वाराणसी, प्रयागराज, आगरा और उत्तर प्रदेश के अन्य शहरों की स्थानीय खबरें और ज़मीनी रिपोर्ट।', 'Local news and field reporting from Lucknow, Kanpur, Varanasi, Prayagraj, Agra, and across Uttar Pradesh.'),
      alternates: { canonical: '/region/uttar-pradesh' },
    };
  }
  return place
    ? {
        title: copy(locale, `${label} की खबरें`, `${label} news`),
        description: copy(
          locale,
          `${label} से स्थानीय खबरें, ज़मीनी रिपोर्ट और वीडियो।`,
          `Local news, field reports and videos from ${label}.`,
        ),
        alternates: { canonical: `/${kind}/${slug}` },
      }
    : { title: copy(locale, 'पृष्ठ नहीं मिला', 'Page not found') };
}
export async function PlaceCoverage({
  kind,
  slug,
  page,
}: {
  kind: Kind;
  slug: string;
  page?: string;
}) {
  const place = placeFor(kind, slug);
  if (!place) notFound();
  const city = kind === 'city' ? cities.find((item) => item.slug === slug)! : undefined;
  const region = regions.find((item) => item.slug === (city?.region ?? slug))!;
  const localCities = regionCities(region.slug);
  const [result, locale] = await Promise.all([
    getArticlePage({ region: region.slug, cities: city?.aliases, page }),
    getReaderLocale(),
  ]);
  const name = placeLabel(place, locale);
  return (
    <>
      <SiteHeader category={region.slug === 'uttar-pradesh' ? 'Uttar Pradesh' : ''} />
      <main id="main-content">
        <header className="page-heading" id="stories">
          <div>
            <nav className="coverage-breadcrumb" aria-label={copy(locale, 'पृष्ठ क्रम', 'Breadcrumb')}>
              <Link href="/">{copy(locale, 'मुख्य पृष्ठ', 'Home')}</Link>
              <span aria-hidden="true">/</span>
              <Link href="/regions">{copy(locale, 'राज्य और शहर', 'States and cities')}</Link>
              {city && (
                <>
                  <span aria-hidden="true">/</span>
                  <Link href={`/region/${region.slug}`}>{regionTitle(region, locale)}</Link>
                </>
              )}
            </nav>
            <h1>{copy(locale, `${name} की खबरें`, `${name} news`)}</h1>
            <p>
              {city
                ? copy(
                    locale,
                    'शहर की हलचल, स्थानीय मुद्दे और ज़मीनी रिपोर्ट।',
                    'City news, local issues, and first-hand reporting.',
                  )
                : copy(
                    locale,
                    'शहरों और कस्बों से स्थानीय खबरें और रिपोर्ट।',
                    'Local news and reporting from cities and towns across the region.',
                  )}
            </p>
          </div>
          <span className="result-count">{reportCount(locale, result.total)}</span>
        </header>
        <nav
          className="coverage-topics"
          aria-label={copy(locale, 'इस क्षेत्र के शहर', 'Cities in this region')}
        >
          {localCities.map((item) => (
            <Link
              key={item.slug}
              href={`/city/${item.slug}`}
              aria-current={city?.slug === item.slug ? 'page' : undefined}
            >
              {cityTitle(item, locale)}
            </Link>
          ))}
        </nav>
        <div className="coverage-layout">
          <section aria-label={copy(locale, `${name} की खबरें`, `${name} news`)}>
            <CoverageFeed result={result} base={`/${kind}/${slug}`} />
          </section>
          <CoverageRail places={localCities.filter((item) => item.slug !== city?.slug)} />
        </div>
      </main>
    </>
  );
}
