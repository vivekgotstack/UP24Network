import type { Metadata } from 'next';
import { NewsletterSection } from '@/components/newsletter-section';
import { SiteHeader } from '@/components/site-header';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import styles from '@/components/newsletter.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getReaderLocale();
  return {
    title: copy(locale, 'न्यूज़लेटर', 'Newsletter'),
    description: copy(locale, 'UP24Network का न्यूज़लेटर ईमेल पर पाने के लिए सदस्यता लें।', 'Subscribe to the UP24Network newsletter.'),
    alternates: { canonical: '/newsletter' },
  };
}

export default async function NewsletterPage() {
  const locale = await getReaderLocale();
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" className={styles.page} lang={locale}>
        <header className={styles.heading}>
          <h1>{copy(locale, 'UP24Network न्यूज़लेटर', 'UP24Network newsletter')}</h1>
          <p>{copy(locale, 'उत्तर प्रदेश और देश की चुनिंदा खबरें सीधे अपने ईमेल पर पाएँ।', 'Get selected news from Uttar Pradesh and across India in your inbox.')}</p>
        </header>
        <NewsletterSection variant="page" locale={locale} />
        <p className={styles.delivery}>
          {copy(locale, 'ईमेल में भेजे गए लिंक से पुष्टि के बाद सदस्यता शुरू होती है। हर न्यूज़लेटर में सदस्यता रद्द करने का लिंक मिलेगा।', 'Confirm your subscription using the link in your email. Each newsletter includes an unsubscribe link.')}
        </p>
      </main>
    </>
  );
}
