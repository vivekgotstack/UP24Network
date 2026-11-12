import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { SiteHeader } from '@/components/site-header';
import { StoryCard } from '@/components/story-card';
import { NewsList } from '@/components/news-list';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { RashifalSection } from '@/components/rashifal-section';
import { getArticles } from '@/lib/articles';
import { newest, pageOf } from '@/lib/news';
import { newsSections } from '@/lib/sections';

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
  const [{ slug }, filters, all] = await Promise.all([params, searchParams, getArticles()]);
  const section = newsSections.find((s) => s.slug === slug);
  if (!section) notFound();
  const results = pageOf(
    newest(all).filter((a) => a.category === section.name),
    filters.page,
  );
  return (
    <>
      <SiteHeader category={section.name} />
      <main id="main-content">
        <header className="page-heading" id="stories">
          <div>
            <p className="eyebrow">UP24Network / {section.name}</p>
            <h1 lang="hi">{section.title}</h1>
            <p lang="hi">{section.description}</p>
          </div>
        </header>
        {section.name === 'Rashifal' ? (
          <Suspense fallback={<p className="loading-note">Opening today's edition…</p>}>
            <RashifalSection showEmpty />
          </Suspense>
        ) : results.total ? (
          <>
            <div className="story-grid">
              {results.items.map((article) => (
                <StoryCard key={article.slug} article={article} />
              ))}
            </div>
            <Pagination page={results.page} pages={results.pages} base={`/section/${slug}`} />
          </>
        ) : (
          <EmptyState />
        )}
        {!results.total && section.name !== 'Rashifal' && all.length > 0 && (
          <section className="more-stories">
            <div className="section-heading">
              <h2 lang="hi">दूसरी खबरें</h2>
            </div>
            <NewsList articles={newest(all).slice(0, 3)} />
          </section>
        )}
      </main>
    </>
  );
}
