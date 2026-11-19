import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { SiteHeader } from '@/components/site-header';
import { CoverageFeed } from '@/components/coverage-feed';
import { CoverageRail } from '@/components/coverage-rail';
import { RashifalSection } from '@/components/rashifal-section';
import { getArticlePage } from '@/lib/articles';
import {
  newsSections,
  sectionCategories,
  sectionDescription,
  sectionHref,
  sectionTitle,
} from '@/lib/sections';
import { reportCount } from '@/lib/coverage-labels';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getReaderLocale()]);
  const section = newsSections.find((s) => s.slug === slug);
  return section
    ? {
        title: sectionTitle(section.name, locale),
        description: sectionDescription(section, locale),
        alternates: { canonical: `/section/${section.slug}` },
      }
    : { title: copy(locale, 'विभाग नहीं मिला', 'Section not found') };
}
export default async function SectionPage({ params, searchParams }: Props) {
  const [{ slug }, filters, locale] = await Promise.all([params, searchParams, getReaderLocale()]);
  const section = newsSections.find((s) => s.slug === slug);
  if (!section) notFound();
  if (section.name === 'Videos') redirect('/watch');
  if (section.slug === 'uttar-pradesh') redirect('/region/uttar-pradesh');
  const results =
    section.name === 'Rashifal'
      ? null
      : await getArticlePage({ categories: sectionCategories(section), page: filters.page });
  const children = newsSections.filter((item) => item.parent === (section.parent ?? section.slug));
  const parent = newsSections.find((item) => item.slug === section.parent);
  const sectionLabel = sectionTitle(section.name, locale);
  return (
    <>
      <SiteHeader category={section.name} />
      <main id="main-content">
        <header className="page-heading" id="stories">
          <div>
            <nav className="coverage-breadcrumb" aria-label={copy(locale, 'पृष्ठ क्रम', 'Breadcrumb')}>
              <Link href="/">{copy(locale, 'मुख्य पृष्ठ', 'Home')}</Link>
              <span aria-hidden="true">/</span>
              <Link href="/sections">{copy(locale, 'विभाग', 'Sections')}</Link>
              {parent && (
                <>
                  <span aria-hidden="true">/</span>
                  <Link href={sectionHref(parent.name)}>{sectionTitle(parent.name, locale)}</Link>
                </>
              )}
            </nav>
            <h1>{sectionLabel}</h1>
            <p>{sectionDescription(section, locale)}</p>
          </div>
          {results && <span className="result-count">{reportCount(locale, results.total)}</span>}
        </header>
        {children.length > 0 && (
          <nav className="coverage-topics" aria-label={copy(locale, 'उपविभाग', 'Subsections')}>
            {parent && (
              <Link href={sectionHref(parent.name)}>{sectionTitle(parent.name, locale)}</Link>
            )}
            {children.map((child) => (
              <Link
                key={child.slug}
                href={sectionHref(child.name)}
                aria-current={child.slug === slug ? 'page' : undefined}
              >
                {sectionTitle(child.name, locale)}
              </Link>
            ))}
          </nav>
        )}
        {section.name === 'Rashifal' ? (
          <Suspense
            fallback={
              <p className="loading-note">
                {copy(locale, 'आज का संस्करण खुल रहा है…', 'Opening today’s edition…')}
              </p>
            }
          >
            <RashifalSection showEmpty />
          </Suspense>
        ) : (
          results && (
            <div className="coverage-layout">
              <section aria-label={copy(locale, `${sectionLabel} की खबरें`, `${sectionLabel} news`)}>
                <CoverageFeed result={results} base={`/section/${slug}`} />
              </section>
              <CoverageRail
                related={newsSections
                  .filter(
                    (item) =>
                      item.slug !== slug &&
                      (item.parent === section.slug ||
                        (item.parent === section.parent && item.parent !== undefined) ||
                        ['india', 'business', 'sports'].includes(item.slug)),
                  )
                  .slice(0, 6)}
              />
            </div>
          )
        )}
      </main>
    </>
  );
}
