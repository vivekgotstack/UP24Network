import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { articleDate, getArticle } from "@/lib/articles";
import { VideoStory } from "@/components/video-story";
import { YouTubeStory } from '@/components/youtube-story';

export const dynamic = "force-dynamic";
type ArticlePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Article not found" };
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      type: "article", title: article.title, description: article.summary,
      url: `/news/${article.slug}`, images: [{ url: article.image, alt: article.imageAlt }],
      publishedTime: article.publishedAt, authors: [article.author], section: article.category,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  return (
    <>
      <SiteHeader category={article.category} />
      <main id="main-content" className="article-page">
        <Link href="/" className="back-link">Back to the front page</Link>
        <article>
          <header className="article-heading">
            <p className="eyebrow">{article.category} / {article.city}</p>
            <h1>{article.title}</h1><p className="article-deck">{article.summary}</p>
            <div className="article-byline"><span className="author-avatar" aria-hidden="true">24</span>
              <div><strong>{article.author}</strong><p><time dateTime={article.publishedAt}>{articleDate(article.publishedAt)}</time>
                <span aria-hidden="true"> · </span>{article.readingMinutes} min read</p></div></div>
          </header>
          <figure className="article-figure"><div className="article-image">{article.youtubeId ? <YouTubeStory videoId={article.youtubeId} title={article.title} /> : article.videoUrl ?
            <VideoStory title={article.title} poster={article.image} src={article.videoUrl} large /> :
            <Image src={article.image} alt={article.imageAlt} fill preload loading="eager" sizes="(max-width: 1100px) 100vw, 1100px" />}</div>
            <figcaption>{article.demo ? 'Illustrative media · Development sample' : 'UP24Network'}</figcaption></figure>
          <div className="article-body">
            {article.demo && <p className="sample-note">Sample article for the development edition. This is illustrative content, not a reported news event.</p>}
            {article.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {article.sourceUrl && <p className="article-source"><a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">Original UP24Network report</a></p>}
            <div className="article-end"><span className="red-square" aria-hidden="true" /><Link href={`/?category=${encodeURIComponent(article.category)}#stories`}>More from {article.category}</Link></div>
          </div>
        </article>
      </main>
    </>
  );
}
