import type { Metadata } from 'next';
import { AirQualityCityPicker } from '@/components/air-quality-city-picker';
import { SiteHeader } from '@/components/site-header';
import { getAirQuality } from '@/lib/air-quality-api';
import styles from '@/components/air-quality.module.css';

export const metadata: Metadata = {
  title: 'भारत का वायु गुणवत्ता सूचकांक (AQI)',
  description: 'उत्तर प्रदेश और देश के चुने हुए शहरों की वायु गुणवत्ता और रीडिंग का समय देखें।',
  alternates: { canonical: '/aqi-india' },
};

export default async function AirQualityPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const [cities, params] = await Promise.all([getAirQuality(), searchParams]);
  const initialCity =
    cities.find(({ key }) => key === params.city) ?? cities.find(({ aqi }) => aqi !== null);
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" className={styles.page}>
        <header>
          <h1>वायु गुणवत्ता सूचकांक (AQI)</h1>
          <p>उत्तर प्रदेश और भारत के चुने हुए शहरों की वायु गुणवत्ता। रीडिंग शहर के एक स्थान की है।</p>
          <span className={styles.scale}>US EPA पैमाना</span>
        </header>
        {initialCity ? (
          <AirQualityCityPicker
            key={initialCity.key}
            cities={cities}
            asOf={Date.now()}
            initialCity={initialCity.key}
          />
        ) : (
          <p className={styles.empty}>इस समय वायु गुणवत्ता की रीडिंग उपलब्ध नहीं है।</p>
        )}
      </main>
    </>
  );
}
