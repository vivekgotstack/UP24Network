import type { AirQualityCity } from '@/lib/air-quality-api';
import { copy, type SiteLocale } from '@/lib/locale';
import styles from './air-quality.module.css';

export const aqiBands = [
  { limit: 50, range: '0–50', label: 'अच्छी', english: 'Good', color: styles.good },
  { limit: 100, range: '51–100', label: 'मध्यम', english: 'Moderate', color: styles.moderate },
  {
    limit: 150,
    range: '101–150',
    label: 'संवेदनशील समूहों के लिए अस्वस्थ',
    english: 'Unhealthy for sensitive groups',
    color: styles.sensitive,
  },
  { limit: 200, range: '151–200', label: 'अस्वस्थ', english: 'Unhealthy', color: styles.unhealthy },
  {
    limit: 300,
    range: '201–300',
    label: 'बहुत अस्वस्थ',
    english: 'Very unhealthy',
    color: styles.veryUnhealthy,
  },
  {
    limit: Infinity,
    range: '301+',
    label: 'खतरनाक',
    english: 'Hazardous',
    color: styles.hazardous,
  },
];

const timeOptions = {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
} as const;
const observedTime = {
  hi: new Intl.DateTimeFormat('hi-IN', timeOptions),
  en: new Intl.DateTimeFormat('en-IN', timeOptions),
};

export function AirQualityReading({
  city,
  asOf,
  compact = false,
  locale,
}: {
  city: AirQualityCity;
  asOf: number;
  compact?: boolean;
  locale: SiteLocale;
}) {
  const { aqi, observedAt } = city;
  if (aqi === null || observedAt === null)
    return (
      <span className={styles.unavailable}>
        {copy(locale, 'रीडिंग उपलब्ध नहीं', 'Reading unavailable')}
      </span>
    );
  const band = aqiBands.find(({ limit }) => aqi <= limit) ?? aqiBands[5];
  const older = asOf - Date.parse(observedAt) >= 3 * 60 * 60 * 1000;
  return (
    <span className={styles.reading} data-compact={compact || undefined}>
      <span className={`${styles.value} ${band.color}`}>
        <span className="sr-only">AQI </span>
        {aqi}
      </span>
      <span className={styles.readingDetail}>
        <strong>{copy(locale, band.label, band.english)}</strong>
        {(!compact || older) && (
          <span className={styles.time}>
            {older && copy(locale, 'पिछली रीडिंग · ', 'Previous reading · ')}
            <time dateTime={observedAt}>
              {observedTime[locale].format(new Date(observedAt))} IST
            </time>
          </span>
        )}
      </span>
    </span>
  );
}
