import { getHoroscope } from '@/lib/horoscope';
import { RashifalReadings } from '@/components/rashifal-readings';

export async function RashifalSection({ showEmpty = false }: { showEmpty?: boolean }) {
  const edition = await getHoroscope();
  if (!edition)
    return showEmpty ? (
      <section className="empty-state" lang="hi">
        <h2>आज का राशिफल अभी उपलब्ध नहीं है।</h2>
        <p>नया दैनिक संस्करण उपलब्ध होने पर यहाँ दिखाई देगा।</p>
      </section>
    ) : null;
  return <RashifalReadings edition={edition} />;
}
