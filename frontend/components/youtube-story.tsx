'use client';
import { useState } from 'react';
import { Play } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { NewsImage } from '@/components/news-image';
import { useConsent } from '@/lib/consent';
import { CookiePreferences } from '@/components/cookie-consent';
import styles from './youtube-story.module.css';

export function YouTubeStory({
  videoId,
  title,
  thumbnail,
}: {
  videoId: string;
  title: string;
  thumbnail: string;
}) {
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const { choice } = useConsent();
  return (
    <div className="inline-video" id="report-video">
      {playing && !choice?.externalVideo ? (
        <div className={styles.consent} lang="hi" role="group" aria-label="YouTube वीडियो अनुमति">
          <p>
            यह वीडियो YouTube पर होस्ट किया गया है। प्लेयर लोड करने से पहले आपकी अनुमति चाहिए। खबर नीचे पढ़
            सकते हैं।
          </p>
          <CookiePreferences>YouTube की अनुमति चुनें</CookiePreferences>
          <button type="button" className={styles.cancel} onClick={() => setPlaying(false)}>
            वीडियो बंद रखें
          </button>
        </div>
      ) : playing && choice?.externalVideo ? (
        <iframe
          className="youtube-player"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <motion.button
          type="button"
          className="video-trigger"
          aria-label={`Play: ${title}`}
          onClick={() => setPlaying(true)}
          whileHover={reduced ? undefined : { scale: 1.012 }}
        >
          <NewsImage src={thumbnail} sizes="(max-width: 1100px) 100vw, 1050px" />
          <span className="video-shade" />
          <span className="play-mark" aria-hidden="true">
            <Play size={22} fill="currentColor" />
          </span>
        </motion.button>
      )}
    </div>
  );
}
