import type { Metadata } from 'next';
import { AirQualityCityPicker } from '@/components/air-quality-city-picker';
import { SiteHeader } from '@/components/site-header';
import { getAirQuality } from '@/lib/air-quality-api';
import { aqiLocation } from '@/lib/air-quality-labels';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import styles from '@/components/air-quality.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getReaderLocale();
  return {
    title: copy(locale, 'भारत का वायु गुणवत्ता सूचकांक (AQI)', 'Air Quality Index in India'),
    description: copy(
      locale,
      'उत्तर प्रदेश और देश के चुने हुए शहरों की वायु गुणवत्ता देखें।',
      'Air quality readings for selected cities across India.',
    ),
    alternates: { canonical: '/aqi-india' },
  };
}

export default async function AirQualityPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const [cities, params, locale] = await Promise.all([
    getAirQuality(),
    searchParams,
    getReaderLocale(),
  ]);
  const initialCity =
    cities.find(({ key }) => key === params.city) ?? cities.find(({ aqi }) => aqi !== null);
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" className={styles.page}>
        <header>
          <h1>{copy(locale, 'वायु गुणवत्ता सूचकांक (AQI)', 'Air Quality Index (AQI)')}</h1>
          <p>
            {copy(
              locale,
              'हर रीडिंग चुने हुए शहर के एक स्थान की है।',
              'Each reading represents one location in the selected city.',
            )}
          </p>
          <span className={styles.scale}>{copy(locale, 'US EPA पैमाना', 'US EPA scale')}</span>
        </header>
        {initialCity ? (
          <AirQualityCityPicker
            key={initialCity.key}
            cities={cities.map((city) => aqiLocation(city, locale))}
            asOf={Date.now()}
            initialCity={initialCity.key}
            locale={locale}
          />
        ) : (
          <p className={styles.empty}>
            {copy(
              locale,
              'अभी वायु गुणवत्ता की रीडिंग उपलब्ध नहीं है।',
              'Air quality readings are unavailable right now.',
            )}
          </p>
        )}
      </main>
    </>
  );
}
