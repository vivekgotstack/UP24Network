import { getHoroscope } from '@/lib/horoscope';
import { RashifalReadings } from '@/components/rashifal-readings';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export async function RashifalSection({
  showEmpty = false,
  compact = false,
}: {
  showEmpty?: boolean;
  compact?: boolean;
}) {
  const [edition, locale] = await Promise.all([getHoroscope(), getReaderLocale()]);
  if (!edition)
    return showEmpty ? (
      <section className="empty-state">
        <h2>
          {copy(locale, 'आज का राशिफल अभी उपलब्ध नहीं है।', 'Today’s horoscope is unavailable.')}
        </h2>
        <p>{copy(locale, 'नया संस्करण यहाँ दिखाई देगा।', 'The new edition will appear here.')}</p>
      </section>
    ) : null;
  return <RashifalReadings edition={edition} compact={compact} locale={locale} />;
}
