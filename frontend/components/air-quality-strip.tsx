import Link from 'next/link';
import { getAirQuality } from '@/lib/air-quality-api';
import { AirQualityReading } from '@/components/air-quality-reading';
import { aqiLocation } from '@/lib/air-quality-labels';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import styles from './air-quality.module.css';

export async function AirQualityStrip() {
  const [readings, locale] = await Promise.all([getAirQuality(), getReaderLocale()]);
  const cities = readings
    .filter((city) => city.aqi !== null)
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 3);
  if (cities.length === 0) return null;
  const asOf = Date.now();
  return (
    <section className={styles.strip} aria-labelledby="air-quality-strip-title">
      <div className={styles.stripHeading}>
        <div>
          <h2 id="air-quality-strip-title">
            {copy(locale, 'वायु गुणवत्ता', 'Air quality')} <span lang="en">(AQI)</span>
          </h2>
          <span className={styles.scale}>{copy(locale, 'US EPA पैमाना', 'US EPA scale')}</span>
        </div>
        <Link href="/aqi-india">{copy(locale, 'सभी शहर', 'All cities')}</Link>
      </div>
      <ul className={styles.locations}>
        {cities.map((city) => (
          <li key={city.key}>
            <Link href={`/aqi-india?city=${city.key}`}>
              <strong>{aqiLocation(city, locale).city}</strong>
              <AirQualityReading city={city} asOf={asOf} locale={locale} compact />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
