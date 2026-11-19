import Link from 'next/link';
import { getCricketScores } from '@/lib/cricket-api';
import { copy, type SiteLocale } from '@/lib/locale';
import { sectionHref } from '@/lib/sections';
import styles from './cricket-scoreboard.module.css';

export async function CricketScoreboard({ locale }: { locale: SiteLocale }) {
  const { matches: snapshot, updatedAt } = await getCricketScores();
  const age = updatedAt ? Date.now() - Date.parse(updatedAt) : Number.POSITIVE_INFINITY;
  const matches = snapshot.filter(({ live }) => age < (live ? 25 * 60_000 : 86_400_000));
  const refreshTime =
    matches.length > 0 && updatedAt
      ? new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
          timeZoneName: 'short',
        }).format(new Date(updatedAt))
      : null;

  return (
    <section className={styles.scoreboard} aria-labelledby="cricket-scoreboard-title">
      <header className={styles.heading}>
        <div>
          <h2 id="cricket-scoreboard-title">{copy(locale, 'क्रिकेट स्कोर', 'Cricket scores')}</h2>
          {matches.length > 0 && refreshTime && updatedAt && (
            <p className={styles.updated}>
              {copy(locale, 'अपडेट', 'Updated')} <time dateTime={updatedAt}>{refreshTime}</time>
            </p>
          )}
        </div>
        <Link href={sectionHref('Cricket')}>{copy(locale, 'क्रिकेट की खबरें', 'Cricket news')}</Link>
      </header>
      {matches.length === 0 ? (
        <p className={styles.empty}>
          {copy(locale, 'अभी कोई मैच स्कोर उपलब्ध नहीं है।', 'No match scores available right now.')}
        </p>
      ) : (
        <ul className={styles.matches}>
          {matches.slice(0, 3).map(({ id, live, status, note, home, away }) => (
            <li key={id} className={styles.match}>
              <p className={live ? styles.live : styles.status} lang={live ? locale : 'en'}>
                {live ? copy(locale, 'लाइव', 'Live') : status}
              </p>
              {[home, away].map((team) => (
                <div className={styles.team} key={team.name}>
                  <strong lang="en">{team.name}</strong>
                  <span>{team.score || '–'}</span>
                </div>
              ))}
              {note && (
                <p className={styles.note} lang="en">
                  {note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
