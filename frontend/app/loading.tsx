import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export default async function Loading() {
  const locale = await getReaderLocale();
  const label = copy(locale, 'खबरें लोड हो रही हैं…', 'Loading reports…');
  return (
    <main id="main-content" className="page-loading" aria-busy="true" aria-label={label}>
      <div className="loading-masthead skeleton" />
      <div className="loading-title skeleton" />
      <div className="story-grid">
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <div className="loading-cover skeleton" />
            <div className="loading-line skeleton" />
            <div className="loading-line short skeleton" />
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">
        {label}
      </p>
    </main>
  );
}
