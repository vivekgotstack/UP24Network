import 'server-only';

export type DailyReading = {
  sign: string;
  name: string;
  reading: string;
  luckyNumber: string;
  luckyColour: string;
};
export type HoroscopeEdition = { date: string; fetchedAt: string; signs: DailyReading[] };

export async function getHoroscope(): Promise<HoroscopeEdition | undefined> {
  try {
    const response = await fetch(
      `${process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080'}/api/horoscope/today`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      },
    );
    if (response.status === 204) return undefined;
    if (!response.ok) throw new Error('Daily section unavailable');
    return response.json();
  } catch {
    // This optional section must not prevent the news page from rendering.
    console.warn('The daily Rashifal section is temporarily unavailable.');
    return undefined;
  }
}
