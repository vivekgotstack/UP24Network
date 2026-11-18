import Link from 'next/link';
import { getAirQuality } from '@/lib/air-quality-api';
import { AirQualityReading } from '@/components/air-quality-reading';
import styles from './air-quality.module.css';

export async function AirQualityStrip() {
  const available = (await getAirQuality()).filter((city) => city.aqi !== null);
  const cities = available.sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 3);
  if (cities.length === 0) return null;
  const asOf = Date.now();
  return (
    <section className={styles.strip} aria-labelledby="air-quality-strip-title">
      <div className={styles.stripHeading}>
        <div>
          <h2 id="air-quality-strip-title">
            वायु गुणवत्ता <span lang="en">(AQI)</span>
          </h2>
          <span className={styles.scale}>US EPA पैमाना</span>
        </div>
        <Link href="/aqi-india">सभी शहर</Link>
      </div>
      <ul className={styles.locations}>
        {cities.map((city) => (
          <li key={city.key}>
            <Link href={`/aqi-india?city=${city.key}`}>
              <strong>{city.city}</strong>
              <AirQualityReading city={city} asOf={asOf} compact />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
