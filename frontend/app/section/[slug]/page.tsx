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
import { newsSections, sectionCategories, sectionHref } from '@/lib/sections';
import { regionCities } from '@/lib/regions';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const section = newsSections.find((s) => s.slug === slug);
  return section
    ? {
        title: section.title,
        description: section.description,
        alternates: { canonical: `/section/${section.slug}` },
      }
    : { title: 'Section not found' };
}
export default async function SectionPage({ params, searchParams }: Props) {
  const [{ slug }, filters] = await Promise.all([params, searchParams]);
  const section = newsSections.find((s) => s.slug === slug);
  if (!section) notFound();
  if (section.name === 'Videos') redirect('/watch');
  const results =
    section.name === 'Rashifal'
      ? null
      : await getArticlePage({ categories: sectionCategories(section), page: filters.page });
  const children = newsSections.filter((item) => item.parent === (section.parent ?? section.slug));
  const parent = newsSections.find((item) => item.slug === section.parent);
  return (
    <>
      <SiteHeader category={section.name} />
      <main id="main-content">
        <header className="page-heading" id="stories">
          <div>
            <nav className="coverage-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">मुख्य पृष्ठ</Link>
              <span>/</span>
              <Link href="/sections">विभाग</Link>
              {parent && (
                <>
                  <span>/</span>
                  <Link href={sectionHref(parent.name)}>{parent.title}</Link>
                </>
              )}
            </nav>
            <h1 lang="hi">{section.title}</h1>
            <p lang="hi">{section.description}</p>
          </div>
          {results && <span className="result-count">{results.total} रिपोर्ट</span>}
        </header>
        {children.length > 0 && (
          <nav className="coverage-topics" aria-label="Subsections">
            {parent && <Link href={sectionHref(parent.name)}>{parent.title}</Link>}
            {children.map((child) => (
              <Link
                key={child.slug}
                href={sectionHref(child.name)}
                aria-current={child.slug === slug ? 'page' : undefined}
              >
                {child.title}
              </Link>
            ))}
          </nav>
        )}
        {slug === 'uttar-pradesh' && (
          <nav className="coverage-topics" aria-label="Uttar Pradesh cities">
            {regionCities(slug).map((city) => (
              <Link key={city.slug} href={`/city/${city.slug}`}>
                {city.title}
              </Link>
            ))}
          </nav>
        )}
        {section.name === 'Rashifal' ? (
          <Suspense fallback={<p className="loading-note">Opening today's edition…</p>}>
            <RashifalSection showEmpty />
          </Suspense>
        ) : (
          results && (
            <div className="coverage-layout">
              <section aria-label={`${section.title} की खबरें`}>
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
