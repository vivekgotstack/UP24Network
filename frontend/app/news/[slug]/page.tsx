import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { articleDate, getArticle, getArticles } from '@/lib/articles';
import { StoryCard } from '@/components/story-card';
import { NewsImage } from '@/components/news-image';
import { VideoStory } from '@/components/video-story';
import { YouTubeStory } from '@/components/youtube-story';
import { InstagramReel } from '@/components/instagram-reel';
import { ReadingExperience } from '@/components/reading-experience';
import { ArticleViewEvent } from '@/components/article-view-event';
import { ArticleProse } from '@/components/article-prose';
import { textLanguage } from '@/lib/language';
import { sectionHref, sectionTitle } from '@/lib/sections';
import { newest } from '@/lib/news';
import { copy, isSiteLocale } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import { localizeArticle } from '@/lib/article-locale';
import { canonicalReelUrl } from '@/lib/instagram';
import officialLogo from '@/public/brand/up24-logo.png';

export const dynamic = 'force-dynamic';
type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string }>;
};
const deskBylines = new Set(['UP24Network Editorial Team', 'UP24Network Desk']);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [original, locale] = await Promise.all([
    getArticle((await params).slug),
    getReaderLocale(),
  ]);
  if (!original) return { title: copy(locale, 'खबर नहीं मिली', 'Report not found') };
  const article = localizeArticle(original, locale);
  const indexable = process.env.SITE_INDEXABLE === 'true' && !article.demo;
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/news/${article.slug}` },
    robots: indexable
      ? { index: true, follow: true, 'max-image-preview': 'large' }
      : { index: false, follow: false },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.summary,
      url: `/news/${article.slug}`,
      siteName: 'UP24Network',
      locale: textLanguage(article.title) === 'hi' ? 'hi_IN' : 'en_IN',
      images: [{ url: article.image, alt: article.imageAlt }],
      publishedTime: article.publishedAt,
      authors: [article.author],
      section: article.category,
      tags: article.tags,
    },
  };
}
export default async function ArticlePage({ params, searchParams }: Props) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const slug = (await params).slug;
  const [original, all, locale] = await Promise.all([
    getArticle(slug),
    getArticles(),
    getReaderLocale(),
  ]);
  if (!original) notFound();
  const article = localizeArticle(original, locale);
  const requestedLocale = (await searchParams)?.lang;
  if (article.slug !== slug) {
    const languageQuery = isSiteLocale(requestedLocale) ? `?lang=${requestedLocale}` : '';
    permanentRedirect(`/news/${encodeURIComponent(article.slug)}${languageQuery}`);
  }
  const reelUrl = canonicalReelUrl(article.reelUrl);
  const byline = article.author.trim();
  const isDeskByline = deskBylines.has(byline);
  const otherReports = newest(all).filter((report) => report.slug !== slug);
  const authorReports = byline
    ? otherReports
        .filter((report) => report.author.trim() === byline)
        .slice(0, 2)
        .map((report) => localizeArticle(report, locale))
    : [];
  const related = otherReports
    .filter((report) => !authorReports.some((authorReport) => authorReport.slug === report.slug))
    .sort(
      (a, b) => Number(b.category === article.category) - Number(a.category === article.category),
    )
    .slice(0, 3);
  const origin = process.env.SITE_URL ?? 'http://127.0.0.1:3000';
  const mediaCredit = article.mediaCredit?.trim();
  const imageUrl = article.image.startsWith('/brand/')
    ? undefined
    : new URL(article.image, origin).href;
  const tags = article.tags ?? [];
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    inLanguage: textLanguage(article.title),
    description: article.summary,
    datePublished: article.publishedAt,
    image:
      imageUrl && mediaCredit && !reelUrl && !article.videoUrl && !article.youtubeId
        ? { '@type': 'ImageObject', url: imageUrl, creditText: mediaCredit }
        : imageUrl,
    articleSection: article.category,
    keywords: tags.length ? tags : undefined,
    mainEntityOfPage: new URL(`/news/${article.slug}`, origin).href,
    author: { '@type': isDeskByline ? 'Organization' : 'Person', name: article.author },
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
        <nav className="breadcrumbs" aria-label={copy(locale, 'पृष्ठ का क्रम', 'Breadcrumb')}>
          <Link href="/">{copy(locale, 'मुख्य पृष्ठ', 'Home')}</Link>
          <span aria-hidden="true">/</span>
          <Link href={sectionHref(article.category)}>{sectionTitle(article.category, locale)}</Link>
        </nav>
        <article>
          {!article.demo && <ArticleViewEvent key={article.slug} slug={article.slug} />}
          <header className="article-heading">
            <p className="eyebrow">
              {sectionTitle(article.category, locale)}
              {article.city && (
                <>
                  {' '}
                  / <span lang={textLanguage(article.city)}>{article.city}</span>
                </>
              )}
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
                <strong lang={textLanguage(byline)}>
                  <Link href="#about-the-author">{byline}</Link>
                </strong>
                {article.updatedBy && (
                  <p>
                    {copy(locale, 'अपडेट', 'Updated by')}{' '}
                    <span lang={textLanguage(article.updatedBy)}>{article.updatedBy}</span>
                  </p>
                )}
                <p>
                  <time dateTime={article.publishedAt}>
                    {articleDate(article.publishedAt, locale)}
                  </time>
                  <span aria-hidden="true"> · </span>
                  {reelUrl
                    ? copy(locale, 'Instagram रील', 'Instagram Reel')
                    : article.youtubeId || article.videoUrl
                      ? copy(locale, 'वीडियो रिपोर्ट', 'Video report')
                      : copy(
                          locale,
                          `${article.readingMinutes} मिनट`,
                          `${article.readingMinutes} min read`,
                        )}
                </p>
                <p>
                  {copy(locale, 'संस्करण', 'Version')} {article.editionNumber ?? 1}
                  {article.continuationOfSlug && (
                    <>
                      {' '}
                      ·{' '}
                      <Link href={`/news/${encodeURIComponent(article.continuationOfSlug)}`}>
                        {copy(locale, 'पिछला संस्करण', 'Previous version')}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </div>
          </header>
          <figure className="article-figure">
            {reelUrl ? (
              <InstagramReel url={reelUrl} title={article.title} locale={locale} />
            ) : (
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
            )}
            {mediaCredit && (
              <figcaption>
                {copy(locale, 'मीडिया श्रेय', 'Media credit')} ·{' '}
                <span lang={textLanguage(mediaCredit)}>{mediaCredit}</span>
              </figcaption>
            )}
          </figure>
          <ReadingExperience
            locale={locale}
            story={{
              slug: article.slug,
              title: article.title,
              category: article.category,
              publishedAt: article.publishedAt,
            }}
          >
            {article.demo && (
              <p className="sample-note">
                {copy(
                  locale,
                  'यह स्थानीय परीक्षण के लिए नमूना सामग्री है।',
                  'Sample content for local preview.',
                )}
              </p>
            )}
            <ArticleProse paragraphs={article.paragraphs} />
            {article.youtubeId && (
              <p className="article-source">
                <a
                  href={`https://www.youtube.com/watch?v=${article.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy(locale, 'YouTube पर देखें', 'Watch on YouTube')}
                </a>
              </p>
            )}
            {tags.length > 0 && (
              <ul
                className="article-topics"
                aria-label={copy(locale, 'खबर के विषय', 'Article topics')}
              >
                {tags.map((tag) => (
                  <li key={tag} lang={textLanguage(tag)}>
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            <div className="article-end">
              <span aria-hidden="true" />
              <Link
                href={{
                  pathname: '/corrections',
                  query: { story: article.slug, lang: locale },
                  hash: 'reader-contact',
                }}
              >
                {copy(locale, 'सुधार का अनुरोध करें', 'Request a correction')}
              </Link>
              <Link href={sectionHref(article.category)}>
                {copy(locale, 'इस विभाग की खबरें', 'More in this section')}
              </Link>
            </div>
          </ReadingExperience>
          <section
            className="article-author"
            id="about-the-author"
            aria-labelledby="article-author-heading"
          >
            <h2 id="article-author-heading">{copy(locale, 'लेखक के बारे में', 'About the author')}</h2>
            <h3 lang={textLanguage(byline)}>{byline}</h3>
            {isDeskByline && (
              <p>
                {copy(
                  locale,
                  'UP24Network का संपादकीय दल उत्तर प्रदेश, देश और दुनिया की खबरें प्रस्तुत करता है।',
                  'UP24Network’s editorial desk covers Uttar Pradesh, national affairs, and international news.',
                )}{' '}
                <Link href="/editorial-policy">
                  {copy(locale, 'संपादकीय मानक', 'Editorial standards')}
                </Link>
              </p>
            )}
            {authorReports.length > 0 ? (
              <ul aria-label={copy(locale, 'लेखक की अन्य खबरें', 'More from this author')}>
                {authorReports.map((report) => (
                  <li key={report.slug}>
                    <Link
                      href={`/news/${encodeURIComponent(report.slug)}`}
                      lang={textLanguage(report.title)}
                    >
                      {report.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : !isDeskByline ? (
              <p>
                <Link href={sectionHref(article.category)}>
                  {sectionTitle(article.category, locale)}
                </Link>
              </p>
            ) : null}
          </section>
        </article>
        {related.length > 0 && (
          <section className="more-stories related-stories">
            <div className="section-heading">
              <h2>{copy(locale, 'यह भी पढ़िए', 'Related reports')}</h2>
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
