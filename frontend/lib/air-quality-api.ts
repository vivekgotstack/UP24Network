import 'server-only';
import { cache } from 'react';

export type AirQualityCity = {
  key: string;
  state: string;
  city: string;
  featured: boolean;
  aqi: number | null;
  observedAt: string | null;
};

export const getAirQuality = cache(async (): Promise<AirQualityCity[]> => {
  const backend = process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080';
  try {
    const response = await fetch(`${backend}/api/air-quality`, {
      next: { revalidate: 60, tags: ['air-quality'] },
      signal: AbortSignal.timeout(2500),
    });
    if (response.ok) return await response.json();
  } catch {
    // The air quality feed is optional for the public reader.
  }
  return [];
});
