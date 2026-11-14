import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { regions, regionCities } from '@/lib/regions';
export const metadata: Metadata = { title: 'राज्य और शहर', alternates: { canonical: '/regions' } };
export default function RegionsPage() {
  return (
    <>
      <SiteHeader compact />
      <main id="main-content">
        <header className="page-heading">
          <div>
            <p className="eyebrow">LOCAL EDITIONS</p>
            <h1>आपके आसपास की खबरें</h1>
            <p>अपना राज्य और शहर चुनकर स्थानीय कवरेज पढ़िए।</p>
          </div>
        </header>
        <div className="region-directory">
          {regions.map((region) => (
            <section key={region.slug}>
              <h2>
                <Link href={`/region/${region.slug}`}>{region.title}</Link>
              </h2>
              <nav aria-label={`${region.title} cities`}>
                {regionCities(region.slug).map((city) => (
                  <Link key={city.slug} href={`/city/${city.slug}`}>
                    {city.title}
                  </Link>
                ))}
              </nav>
              <Link className="text-link" href={`/region/${region.slug}`}>
                राज्य की सभी खबरें
              </Link>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
