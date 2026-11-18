'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { CookiePreferences } from '@/components/cookie-consent';
import { NewsImage } from '@/components/news-image';
import { Button } from '@/components/ui/button';
import { useConsent } from '@/lib/consent';
import { canonicalReelUrl } from '@/lib/instagram';
import styles from './trending-reels.module.css';

export function InstagramReel({
  url,
  title,
  cover,
}: {
  url: string;
  title: string;
  cover: string;
}) {
  const [requested, setRequested] = useState(false);
  const { choice } = useConsent();
  const source = canonicalReelUrl(url);
  if (!source) return null;

  return (
    <figure className={styles.viewer} aria-label="Instagram Reel">
      {requested && choice?.externalVideo ? (
        <iframe
          className={styles.frame}
          src={`${source}embed/`}
          title={title}
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
        />
      ) : (
        <div className={styles.preview}>
          {cover && cover !== '/brand/up24-logo.png' && (
            <div className={styles.viewerCover}>
              <NewsImage src={cover} sizes="(max-width: 540px) 100vw, 520px" />
            </div>
          )}
          {requested ? (
            <div className={styles.permission}>
              <p>Instagram का प्लेयर लोड करने के लिए बाहरी वीडियो की अनुमति दें।</p>
              <CookiePreferences>वीडियो की अनुमति चुनें</CookiePreferences>
            </div>
          ) : (
            <Button type="button" onClick={() => setRequested(true)}>
              <Play aria-hidden="true" /> रील चलाएं
            </Button>
          )}
        </div>
      )}
      <figcaption className={styles.viewerActions}>
        {requested && (
          <Button type="button" variant="ghost" onClick={() => setRequested(false)}>
            रील बंद करें
          </Button>
        )}
        <a href={source} target="_blank" rel="noopener noreferrer">
          Instagram पर मूल रील देखें
        </a>
      </figcaption>
    </figure>
  );
}
