import type { AirQualityCity } from '@/lib/air-quality-api';
import styles from './air-quality.module.css';

export const aqiBands = [
  { limit: 50, range: '0–50', label: 'अच्छी', color: styles.good },
  { limit: 100, range: '51–100', label: 'मध्यम', color: styles.moderate },
  { limit: 150, range: '101–150', label: 'संवेदनशील समूहों के लिए अस्वस्थ', color: styles.sensitive },
  { limit: 200, range: '151–200', label: 'अस्वस्थ', color: styles.unhealthy },
  { limit: 300, range: '201–300', label: 'बहुत अस्वस्थ', color: styles.veryUnhealthy },
  { limit: Infinity, range: '301+', label: 'खतरनाक', color: styles.hazardous },
];

const timeInIndia = new Intl.DateTimeFormat('hi-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export function AirQualityReading({
  city,
  asOf,
  compact = false,
}: {
  city: AirQualityCity;
  asOf: number;
  compact?: boolean;
}) {
  const { aqi, observedAt } = city;
  if (aqi === null || observedAt === null)
    return <span className={styles.unavailable}>रीडिंग उपलब्ध नहीं</span>;
  const band = aqiBands.find(({ limit }) => aqi <= limit) ?? aqiBands[5];
  const older = asOf - Date.parse(observedAt) >= 3 * 60 * 60 * 1000;
  return (
    <span className={styles.reading} data-compact={compact || undefined}>
      <span className={`${styles.value} ${band.color}`}>
        <span className="sr-only">AQI </span>
        {aqi}
      </span>
      <span className={styles.readingDetail}>
        <strong>{band.label}</strong>
        {(!compact || older) && (
          <span className={styles.time}>
            {older && 'पिछली रीडिंग · '}
            <time dateTime={observedAt}>{timeInIndia.format(new Date(observedAt))} IST</time>
          </span>
        )}
      </span>
    </span>
  );
}
