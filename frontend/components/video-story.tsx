'use client';
import { useState } from 'react';
import { Play } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { NewsImage } from '@/components/news-image';

export function VideoStory({
  title,
  poster,
  src,
}: {
  title: string;
  poster: string;
  src: string;
  large?: boolean;
}) {
  const [playing, setPlaying] = useState(false),
    [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  return (
    <div className="inline-video" id="report-video">
      {failed ? (
        <div className="video-unavailable">
          <NewsImage src={poster} alt={title} />
          <p>The video is unavailable. The report remains available below.</p>
        </div>
      ) : playing ? (
        <video
          className="video-player"
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
          aria-label={title}
          onError={() => setFailed(true)}
        >
          {src === '/videos/nature-sample.mp4' && (
            <track
              kind="captions"
              src="/videos/nature-sample.vtt"
              srcLang="en"
              label="English"
              default
            />
          )}
          Your browser does not support embedded video.
        </video>
      ) : (
        <motion.button
          className="video-trigger"
          aria-label={`Play video: ${title}`}
          onClick={() => setPlaying(true)}
          whileHover={reduced ? undefined : { scale: 1.012 }}
        >
          <NewsImage src={poster} sizes="(max-width: 1100px) 100vw, 1050px" />
          <span className="video-shade" />
          <span className="play-mark" aria-hidden="true">
            <Play size={22} fill="currentColor" />
          </span>
        </motion.button>
      )}
    </div>
  );
}
