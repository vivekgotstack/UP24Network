import Link from 'next/link';
import { cities, regions, type NewsCity } from '@/lib/regions';
import { newsSections, sectionHref, type NewsSection } from '@/lib/sections';

export function CoverageRail({
  related = newsSections.filter((section) =>
    ['india', 'politics', 'business', 'education', 'sports'].includes(section.slug),
  ),
  places = cities.slice(0, 6),
}: {
  related?: readonly NewsSection[];
  places?: readonly NewsCity[];
}) {
  return (
    <aside className="coverage-rail">
      <nav aria-label="Related sections">
        <h2>और विभाग</h2>
        {related.map((section) => (
          <Link key={section.slug} href={sectionHref(section.name)}>
            {section.title}
            <small>{section.name}</small>
          </Link>
        ))}
      </nav>
      <nav aria-label="Local news">
        <h2>अपने शहर की खबरें</h2>
        {places.map((city) => (
          <Link key={city.slug} href={`/city/${city.slug}`}>
            {city.title}
          </Link>
        ))}
        <Link href="/regions" className="rail-directory">
          सभी राज्य और शहर
        </Link>
      </nav>
      <nav aria-label="Regional editions">
        <h2>राज्यों से</h2>
        {regions.map((region) => (
          <Link key={region.slug} href={`/region/${region.slug}`}>
            {region.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
