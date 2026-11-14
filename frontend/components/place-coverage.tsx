import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { CoverageFeed } from '@/components/coverage-feed';
import { CoverageRail } from '@/components/coverage-rail';
import { getArticlePage } from '@/lib/articles';
import { cities, regions, regionCities } from '@/lib/regions';

type Kind = 'city' | 'region';
function placeFor(kind: Kind, slug: string) {
  return kind === 'city'
    ? cities.find((city) => city.slug === slug)
    : regions.find((region) => region.slug === slug);
}
export function placeMetadata(kind: Kind, slug: string): Metadata {
  const place = placeFor(kind, slug);
  return place
    ? {
        title: `${place.title} की खबरें`,
        description: `${place.title} से स्थानीय खबरें, जमीनी रिपोर्ट और वीडियो।`,
        alternates: { canonical: `/${kind}/${slug}` },
      }
    : { title: 'Page not found' };
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
  const result = await getArticlePage({ region: region.slug, cities: city?.aliases, page });
  return (
    <>
      <SiteHeader category={region.slug === 'uttar-pradesh' ? 'Uttar Pradesh' : ''} />
      <main id="main-content">
        <header className="page-heading" id="stories">
          <div>
            <nav className="coverage-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">मुख्य पृष्ठ</Link>
              <span>/</span>
              <Link href="/regions">राज्य और शहर</Link>
              {city && (
                <>
                  <span>/</span>
                  <Link href={`/region/${region.slug}`}>{region.title}</Link>
                </>
              )}
            </nav>
            <h1>{place.title} की खबरें</h1>
            <p>
              {city
                ? 'आपके शहर की हलचल, स्थानीय मुद्दे और जमीनी रिपोर्ट।'
                : 'शहरों और कस्बों से स्थानीय रिपोर्ट, जनजीवन और क्षेत्र की खबरें।'}
            </p>
          </div>
          <span className="result-count">{result.total} रिपोर्ट</span>
        </header>
        <nav className="coverage-topics" aria-label="Cities in this region">
          {localCities.map((item) => (
            <Link
              key={item.slug}
              href={`/city/${item.slug}`}
              aria-current={city?.slug === item.slug ? 'page' : undefined}
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="coverage-layout">
          <section aria-label={`${place.title} news`}>
            <CoverageFeed result={result} base={`/${kind}/${slug}`} />
          </section>
          <CoverageRail places={localCities.filter((item) => item.slug !== city?.slug)} />
        </div>
      </main>
    </>
  );
}
