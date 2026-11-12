import Link from 'next/link';
import { VideoPoster } from '@/components/video-poster';
import { textLanguage } from '@/lib/language';
import { hasVideo, newest } from '@/lib/news';
import type { Article } from '@/lib/articles';
export function WatchSection({ articles }: { articles: Article[] }) {
  const videos = newest(articles).filter(hasVideo).slice(0, 3);
  if (!videos.length) return null;
  const [lead, ...rest] = videos;
  return (
    <section className="watch-section" id="watch" aria-labelledby="watch-title">
      <div className="watch-heading">
        <div>
          <p className="eyebrow">UP24Network · VIDEO DESK</p>
          <h2 id="watch-title" lang="hi">
            खबर, सीधे मौके से।
          </h2>
        </div>
        <Link href="/watch" className="text-link">
          All video reports
        </Link>
      </div>
      <div className="watch-layout">
        <div className="watch-feature">
          <div className="watch-screen">
            <VideoPoster slug={lead.slug} title={lead.title} image={lead.image} />
          </div>
          <h3 lang={textLanguage(lead.title)}>
            <Link href={`/news/${lead.slug}`}>{lead.title}</Link>
          </h3>
        </div>
        <div className="watch-queue">
          {rest.map((article) => (
            <article key={article.slug}>
              <span className="eyebrow">VIDEO REPORT</span>
              <h3 lang={textLanguage(article.title)}>
                <Link href={`/news/${article.slug}`}>{article.title}</Link>
              </h3>
              <Link className="text-link" href={`/news/${article.slug}`}>
                Watch report
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
