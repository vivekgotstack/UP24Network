import Link from 'next/link';
import { Play } from 'lucide-react';
import { NewsImage } from '@/components/news-image';
export function VideoPoster({
  slug,
  title,
  image,
}: {
  slug: string;
  title: string;
  image: string;
}) {
  return (
    <Link
      href={`/news/${slug}#report-video`}
      className="video-trigger"
      aria-label={`Watch: ${title}`}
    >
      <NewsImage src={image} sizes="(max-width: 700px) 100vw, 60vw" />
      <span className="video-shade" />
      <span className="play-mark" aria-hidden="true">
        <Play size={22} fill="currentColor" />
      </span>
      <span className="video-label">VIDEO REPORT</span>
      <span className="video-action">Watch report</span>
    </Link>
  );
}
