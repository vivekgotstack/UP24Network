import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { StoryCard } from '@/components/story-card';
import { NewsList } from '@/components/news-list';
import { EmptyState } from '@/components/empty-state';
import { getArticles } from '@/lib/articles';
import { newest } from '@/lib/news';
import { newsSections, sectionHref } from '@/lib/sections';
import { WatchSection } from '@/components/watch-section';
import { Reveal } from '@/components/reveal';
import { HeadlineTicker } from '@/components/headline-ticker';
import { RashifalSection } from '@/components/rashifal-section';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; view?: string }>;
}) {
  const filters = await searchParams;
  if (typeof filters.q === 'string' && filters.q.trim())
    redirect(`/search?q=${encodeURIComponent(filters.q)}`);
  if (typeof filters.category === 'string' && newsSections.some((s) => s.name === filters.category))
    redirect(sectionHref(filters.category));
  if (filters.view === 'latest') redirect('/latest');
  const articles = newest(await getArticles());
  const lead =
    articles.find((a) => a.breaking && Date.now() - Date.parse(a.publishedAt) < 86400000) ??
    articles[0];
  const remaining = articles.filter((a) => a.slug !== lead?.slug);
  const date = new Intl.DateTimeFormat('hi-IN', {
    dateStyle: 'full',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
  const desks = newsSections
    .filter(
      (s) =>
        s.name !== 'Videos' &&
        s.name !== 'Rashifal' &&
        articles.filter((a) => a.category === s.name).length >= 2,
    )
    .slice(0, 3);
  return (
    <>
      <SiteHeader home />
      <HeadlineTicker articles={articles} />
      <main id="main-content">
        <header className="page-heading edition-heading" id="stories">
          <div>
            <p className="eyebrow">THE FRONT PAGE</p>
            <h1 lang="hi">आज की बड़ी खबरें</h1>
          </div>
          <div className="edition-date">
            <span className="edition-stamp">UP24Network</span>
            <time dateTime={new Date().toISOString().slice(0, 10)} lang="hi">
              {date}
            </time>
          </div>
        </header>
        {lead ? (
          <Reveal className="front-grid">
            <StoryCard article={lead} lead />
            <aside className="briefing">
              <div className="section-heading">
                <h2 lang="hi">इस वक्त</h2>
                <Link href="/latest">Latest</Link>
              </div>
              <NewsList articles={remaining.slice(0, 4)} numbered />
              <div className="region-note">
                <p className="eyebrow">YOUR REGION</p>
                <div>
                  {['Lucknow', 'Noida', 'Prayagraj', 'Varanasi'].map((city) => (
                    <Link key={city} href={`/search?q=${city}`}>
                      {city}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </Reveal>
        ) : (
          <EmptyState />
        )}
        <Reveal>
          <WatchSection articles={articles} />
        </Reveal>
        <Suspense fallback={null}>
          <RashifalSection />
        </Suspense>
        {remaining.length > 0 && (
          <section className="more-stories">
            <div className="section-heading">
              <h2 lang="hi">खबरें विस्तार से</h2>
              <Link href="/latest">All reports</Link>
            </div>
            <Reveal className="story-grid">
              {remaining.slice(0, 6).map((article) => (
                <StoryCard key={article.slug} article={article} />
              ))}
            </Reveal>
          </section>
        )}
        {desks.map((desk) => (
          <section className="more-stories" key={desk.slug}>
            <div className="section-heading">
              <h2 lang="hi">{desk.title}</h2>
              <Link href={sectionHref(desk.name)}>View section</Link>
            </div>
            <div className="story-grid">
              {articles
                .filter((a) => a.category === desk.name)
                .slice(0, 3)
                .map((article) => (
                  <StoryCard key={article.slug} article={article} />
                ))}
            </div>
          </section>
        ))}
        <section className="section-directory">
          <div className="section-heading">
            <h2 lang="hi">हर खबर की अपनी जगह</h2>
            <span>EXPLORE</span>
          </div>
          <nav aria-label="Explore categories">
            {newsSections
              .filter((s) => s.name !== 'Videos')
              .map((section) => (
                <Link key={section.slug} href={sectionHref(section.name)}>
                  <span lang="hi">{section.title}</span>
                  <small>{section.name}</small>
                </Link>
              ))}
          </nav>
        </section>
      </main>
    </>
  );
}
