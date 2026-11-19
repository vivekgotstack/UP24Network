import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { cityTitle, regions, regionCities, regionTitle } from '@/lib/regions';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getReaderLocale();
  return {
    title: copy(locale, 'राज्य और शहर', 'States and cities'),
    alternates: { canonical: '/regions' },
  };
}
export default async function RegionsPage() {
  const locale = await getReaderLocale();
  return (
    <>
      <SiteHeader compact />
      <main id="main-content">
        <header className="page-heading">
          <div>
            <h1>{copy(locale, 'राज्य और शहर', 'States and cities')}</h1>
            <p>
              {copy(
                locale,
                'स्थानीय खबरों के लिए अपना राज्य या शहर चुनें।',
                'Choose your state or city for local news.',
              )}
            </p>
          </div>
        </header>
        <div className="region-directory">
          {regions.map((region) => (
            <section key={region.slug}>
              <h2>
                <Link href={`/region/${region.slug}`}>{regionTitle(region, locale)}</Link>
              </h2>
              <nav
                aria-label={copy(
                  locale,
                  `${region.title} के शहर`,
                  `Cities in ${regionTitle(region, locale)}`,
                )}
              >
                {regionCities(region.slug).map((city) => (
                  <Link key={city.slug} href={`/city/${city.slug}`}>
                    {cityTitle(city, locale)}
                  </Link>
                ))}
              </nav>
              <Link className="text-link" href={`/region/${region.slug}`}>
                {copy(locale, 'राज्य की खबरें', 'State news')}
              </Link>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
