import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/articles";
import { VideoStory } from "@/components/video-story";
import { CoverImage } from "@/components/cover-image";

export function StoryCard({ article, lead = false }: { article: Article; lead?: boolean }) {
  return (
    <article className={lead ? "story-card lead-story" : "story-card"}>
      {article.videoUrl ? <div className="story-image"><VideoStory title={article.title} poster={article.image} src={article.videoUrl} /></div> :
      <Link href={`/news/${article.slug}`} className="story-image" tabIndex={-1} aria-hidden="true">
        {lead ? <CoverImage src={article.image} /> : <Image src={article.image} alt="" fill sizes="(max-width: 600px) 100vw, 33vw" />}
        {lead && <span className="image-caption">FEATURE</span>}
      </Link>}
      <div className="story-copy">
        <p className="eyebrow">{article.category}<span className="eyebrow-city"> / {article.city}</span></p>
        <h2><Link href={`/news/${article.slug}`}>{article.title}</Link></h2>
        <p className="story-summary">{article.summary}</p>
        <div className="story-meta"><span>{article.readingMinutes} min read</span></div>
      </div>
    </article>
  );
}
