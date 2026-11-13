import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { articleDate, getArticle, getArticles } from '@/lib/articles';
import { StoryCard } from '@/components/story-card';
import { NewsImage } from '@/components/news-image';
import { VideoStory } from '@/components/video-story';
import { YouTubeStory } from '@/components/youtube-story';
import { ReadingExperience } from '@/components/reading-experience';
import { textLanguage } from '@/lib/language';
import { sectionHref, sectionTitle } from '@/lib/sections';
import { newest } from '@/lib/news';
import officialLogo from '@/public/brand/up24-logo.png';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  if (!article) return { title: 'Report not found' };
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.summary,
      url: `/news/${article.slug}`,
      images: [{ url: article.image, alt: article.imageAlt }],
      publishedTime: article.publishedAt,
      authors: [article.author],
      section: article.category,
    },
  };
}
export default async function ArticlePage({ params }: Props) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const slug = (await params).slug;
  const [article, all] = await Promise.all([getArticle(slug), getArticles()]);
  if (!article) notFound();
  const related = newest(all)
    .filter((a) => a.slug !== slug)
    .sort(
      (a, b) => Number(b.category === article.category) - Number(a.category === article.category),
    )
    .slice(0, 3);
  const origin = process.env.SITE_URL ?? 'http://127.0.0.1:3000';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt,
    image: new URL(article.image, origin).href,
    mainEntityOfPage: new URL(`/news/${article.slug}`, origin).href,
    author: { '@type': 'Person', name: article.author },
    publisher: {
      '@type': 'Organization',
      name: 'UP24Network',
      logo: { '@type': 'ImageObject', url: new URL(officialLogo.src, origin).href },
    },
  };
  return (
    <>
      <SiteHeader category={article.category} compact />
      <main id="main-content" className="article-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href={sectionHref(article.category)} lang="hi">
            {sectionTitle(article.category)}
          </Link>
        </nav>
        <article>
          <header className="article-heading">
            <p className="eyebrow" lang="hi">
              {sectionTitle(article.category)}
              {article.city && ` / ${article.city}`}
            </p>
            <h1 lang={textLanguage(article.title)}>{article.title}</h1>
            <p className="article-deck" lang={textLanguage(article.summary)}>
              {article.summary}
            </p>
            <div className="article-byline">
              <span className="author-avatar" aria-hidden="true">
                {article.author.slice(0, 1)}
              </span>
              <div>
                <strong>{article.author}</strong>
                <p>
                  <time dateTime={article.publishedAt}>{articleDate(article.publishedAt)}</time>
                  <span aria-hidden="true"> · </span>
                  {article.youtubeId || article.videoUrl
                    ? 'Video report'
                    : `${article.readingMinutes} min read`}
                </p>
              </div>
            </div>
          </header>
          <figure className="article-figure">
            <div className="article-image">
              {article.youtubeId ? (
                <YouTubeStory
                  videoId={article.youtubeId}
                  title={article.title}
                  thumbnail={article.image}
                />
              ) : article.videoUrl ? (
                <VideoStory
                  title={article.title}
                  poster={article.image}
                  src={article.videoUrl}
                  large
                />
              ) : (
                <NewsImage
                  src={article.image}
                  alt={article.imageAlt}
                  priority
                  sizes="(max-width: 1100px) 100vw, 1050px"
                />
              )}
            </div>
          </figure>
          <ReadingExperience
            story={{
              slug: article.slug,
              title: article.title,
              category: article.category,
              publishedAt: article.publishedAt,
            }}
          >
            {article.demo && (
              <p className="sample-note">
                This is illustrative development content, not a reported news event.
              </p>
            )}
            {article.paragraphs.map((paragraph, index) => (
              <p key={index} lang={textLanguage(paragraph)}>
                {paragraph}
              </p>
            ))}
            {article.youtubeId && (
              <p className="article-source">
                <a
                  href={`https://www.youtube.com/watch?v=${article.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Watch on the official UP24Network channel
                </a>
              </p>
            )}
            <div className="article-end">
              <span aria-hidden="true" />
              <Link href={sectionHref(article.category)}>More from {article.category}</Link>
            </div>
          </ReadingExperience>
        </article>
        {related.length > 0 && (
          <section className="more-stories related-stories">
            <div className="section-heading">
              <h2 lang="hi">यह भी पढ़िए</h2>
            </div>
            <div className="story-grid">
              {related.map((report) => (
                <StoryCard key={report.slug} article={report} />
              ))}
            </div>
          </section>
        )}
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        />
      </main>
    </>
  );
}
