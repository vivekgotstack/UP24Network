'use client';

import Link from 'next/link';
import { CookiePreferences } from '@/components/cookie-consent';
import { useConsent } from '@/lib/consent';
import { copy, type SiteLocale } from '@/lib/locale';
import styles from './cricket-scoreboard.module.css';

export function CricketScoreboard({ locale }: { locale: SiteLocale }) {
  const { choice } = useConsent();
  const title = copy(locale, 'लाइव क्रिकेट स्कोर', 'Live cricket scores');

  return (
    <section className={styles.scoreboard} aria-labelledby="cricket-scoreboard-title">
      <header className={styles.heading}>
        <h2 id="cricket-scoreboard-title">{title}</h2>
        <Link href="/section/cricket">{copy(locale, 'क्रिकेट की खबरें', 'Cricket news')}</Link>
      </header>
      {choice?.externalScores ? (
        <iframe
          className={styles.frame}
          title={title}
          src="https://sportscore.com/embed/tracker/cricket/live/?theme=light"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className={styles.prompt}>
          <p>
            {copy(locale, 'लाइव स्कोर देखने के लिए बाहरी स्कोर की अनुमति दें।', 'Allow external scores to see the live tracker.')}
          </p>
          <CookiePreferences>{copy(locale, 'स्कोर की सेटिंग्स', 'Score settings')}</CookiePreferences>
        </div>
      )}
    </section>
  );
}
