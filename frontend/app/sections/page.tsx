import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import {
  newsSections,
  sectionDescription,
  sectionGroups,
  sectionHref,
  sectionTitle,
} from '@/lib/sections';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getReaderLocale();
  return {
    title: copy(locale, 'सभी विभाग', 'All sections'),
    alternates: { canonical: '/sections' },
  };
}
export default async function SectionsPage() {
  const locale = await getReaderLocale();
  return (
    <>
      <SiteHeader compact />
      <main id="main-content">
        <header className="page-heading">
          <div>
            <h1>{copy(locale, 'सभी विभाग', 'All sections')}</h1>
            <p>{copy(locale, 'अपनी रुचि की खबरें पढ़ें।', 'Browse news by topic.')}</p>
          </div>
        </header>
        <nav className="coverage-topics" aria-label={copy(locale, 'मुख्य लिंक', 'Quick links')}>
          <Link href="/latest">{copy(locale, 'ताज़ा खबरें', 'Latest news')}</Link>
          <Link href="/regions">{copy(locale, 'राज्य और शहर', 'States and cities')}</Link>
          <Link href="/watch">{copy(locale, 'वीडियो रिपोर्ट', 'Video reports')}</Link>
        </nav>
        {sectionGroups.map((group) => (
          <section className="directory-group" key={group.title}>
            <h2>{copy(locale, group.title, group.englishTitle)}</h2>
            <nav
              className="section-page-grid"
              aria-label={copy(locale, group.title, group.englishTitle)}
            >
              {newsSections
                .filter((section) => group.slugs.includes(section.slug))
                .map((section) => (
                  <Link key={section.slug} href={sectionHref(section.name)}>
                    <h3>{sectionTitle(section.name, locale)}</h3>
                    <p>{sectionDescription(section, locale)}</p>
                  </Link>
                ))}
            </nav>
          </section>
        ))}
      </main>
    </>
  );
}
