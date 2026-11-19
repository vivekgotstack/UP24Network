import Link from 'next/link';
import { cities, cityTitle, regions, regionTitle, type NewsCity } from '@/lib/regions';
import { newsSections, sectionHref, sectionTitle, type NewsSection } from '@/lib/sections';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export async function CoverageRail({
  related = newsSections.filter((section) =>
    ['india', 'politics', 'business', 'education', 'sports'].includes(section.slug),
  ),
  places = cities.slice(0, 6),
}: {
  related?: readonly NewsSection[];
  places?: readonly NewsCity[];
}) {
  const locale = await getReaderLocale();
  const sectionsLabel = copy(locale, 'और विभाग', 'Related sections');
  const citiesLabel = copy(locale, 'शहर की खबरें', 'Local news');
  const regionsLabel = copy(locale, 'राज्यों से', 'Regional editions');
  return (
    <aside className="coverage-rail">
      <nav aria-label={sectionsLabel}>
        <h2>{sectionsLabel}</h2>
        {related.map((section) => (
          <Link key={section.slug} href={sectionHref(section.name)}>
            {sectionTitle(section.name, locale)}
          </Link>
        ))}
      </nav>
      <nav aria-label={citiesLabel}>
        <h2>{citiesLabel}</h2>
        {places.map((city) => (
          <Link key={city.slug} href={`/city/${city.slug}`}>
            {cityTitle(city, locale)}
          </Link>
        ))}
        <Link href="/regions" className="rail-directory">
          {copy(locale, 'सभी राज्य और शहर', 'All states and cities')}
        </Link>
      </nav>
      <nav aria-label={regionsLabel}>
        <h2>{regionsLabel}</h2>
        {regions.map((region) => (
          <Link key={region.slug} href={`/region/${region.slug}`}>
            {regionTitle(region, locale)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
