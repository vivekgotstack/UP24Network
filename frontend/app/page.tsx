import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { StoryCard } from "@/components/story-card";
import { getArticles } from "@/lib/articles";
import { WatchSection } from "@/components/watch-section";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { HeadlineTicker } from '@/components/headline-ticker';

export const dynamic = "force-dynamic";

type Filters = { category?: string; q?: string; view?: string };

export default async function Home({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams;
  const category = typeof filters.category === "string" ? filters.category : "";
  const query = typeof filters.q === "string" ? filters.q.trim().slice(0, 120) : "";
  const latest = filters.view === 'latest';
  const allArticles = await getArticles();
  const articles = allArticles.filter((article) =>
    (!category || article.category === category) &&
    `${article.title} ${article.summary} ${article.city} ${article.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => latest ? new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime() : Number(b.breaking) - Number(a.breaking) || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const [lead, ...remaining] = articles;
  const filtered = Boolean(category || query);

  return (
    <>
      <SiteHeader category={category} latest={latest} />
      <HeadlineTicker articles={allArticles} />
      <main id="main-content">
        <div className="edition-heading" id="stories">
          <div><p className="eyebrow">NEWSROOM</p><h1>{category || (latest ? 'Latest news' : "Top stories")}</h1></div>
          <p className="edition-note">News. Context. Perspective.</p>
        </div>
        <form className="search-form" id="search" role="search" action="/">
          <label htmlFor="story-search">Search articles by topic or city</label>
          <div className="search-controls">
            {category && <input type="hidden" name="category" value={category} />}
            {latest && <input type="hidden" name="view" value="latest" />}
            <input id="story-search" name="q" type="search" defaultValue={query} maxLength={120}
              placeholder="Search a story, topic, or city" />
            <Button type="submit" size="sm">Search</Button>
          </div>
        </form>
        {filtered && <div className="filter-summary"><p>{articles.length} {articles.length === 1 ? "story" : "stories"}
          {query && <> matching “{query}”</>}{category && <> in {category}</>}</p><Link href="/">Clear filters</Link></div>}
        {lead ? (
          <>
            <Reveal className="front-grid">
              <StoryCard article={lead} lead />
              <aside className="briefing" aria-label="Around the newsroom">
                <div className="section-heading"><h2>The briefing</h2><span className="red-square" aria-hidden="true" /></div>
                <p className="briefing-intro">A quick read across the desk.</p>
                {allArticles.filter((article) => article.slug !== lead.slug).slice(0, 3).map((article, index) => (
                  <article className="briefing-item" key={article.slug}>
                    <span className="briefing-number">0{index + 1}</span>
                    <div><p className="eyebrow">{article.category}</p><h3><Link href={`/news/${article.slug}`}>{article.title}</Link></h3>
                      <p className="briefing-time">{article.readingMinutes} min read</p></div>
                  </article>
                ))}
                <div className="desk-note"><p className="eyebrow">OUR REGION</p>
                  <div className="city-links">{["Lucknow", "Noida", "Prayagraj", "Varanasi"].map((city) =>
                    <Link key={city} href={`/?q=${city}#stories`}>{city}</Link>)}</div></div>
              </aside>
            </Reveal>
            {!filtered && <Reveal><WatchSection articles={allArticles} /></Reveal>}
            {remaining.length > 0 && <Reveal><section className="more-stories" aria-label="More stories">
              <div className="section-heading"><h2>{filtered ? "More stories" : "Across the desk"}</h2><span>THE READING LIST</span></div>
              <div className="story-grid">{remaining.map((article) => <StoryCard key={article.slug} article={article} />)}</div>
            </section></Reveal>}
          </>
        ) : <section className="empty-state"><p className="eyebrow">KEEP EXPLORING</p><h2>No stories found.</h2>
          <p>Try another topic or explore the front page.</p><Link className="text-link" href="/">Back to all stories</Link></section>}
      </main>
    </>
  );
}
