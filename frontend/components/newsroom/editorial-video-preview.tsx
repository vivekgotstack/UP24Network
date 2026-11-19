import type { ReactNode } from 'react';
import { InstagramReel } from '@/components/instagram-reel';
import { VideoStory } from '@/components/video-story';
import { YouTubeStory } from '@/components/youtube-story';
import { canonicalReelUrl } from '@/lib/instagram';
import { allowedMedia, videoId } from '@/lib/newsroom/types';
import styles from './article-admin.module.css';

export function EditorialVideoPreview({
  title,
  image,
  direct,
  youtube,
  reel,
  fallback,
}: {
  title: string;
  image: string;
  direct?: string | null;
  youtube?: string | null;
  reel?: string | null;
  fallback?: ReactNode;
}) {
  const poster = allowedMedia(image.trim()) ? image.trim() : '';
  const reelUrl = canonicalReelUrl(reel);
  if (reelUrl) return <InstagramReel url={reelUrl} title={title} locale="en" />;

  let youtubeId = '';
  try {
    youtubeId = videoId(youtube?.trim() ?? '');
  } catch {
    return fallback ?? null;
  }
  const videoUrl = direct?.trim() ?? '';
  if (!youtubeId && (!videoUrl || !allowedMedia(videoUrl, false))) return fallback ?? null;

  return (
    <div className={styles.videoPreview}>
      {youtubeId ? (
        <YouTubeStory key={youtubeId} title={title} thumbnail={poster} videoId={youtubeId} />
      ) : (
        <VideoStory key={videoUrl} title={title} poster={poster} src={videoUrl} />
      )}
    </div>
  );
}
