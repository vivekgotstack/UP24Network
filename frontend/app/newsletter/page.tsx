import type { Metadata } from 'next';
import { NewsletterSection } from '@/components/newsletter-section';
import { SiteHeader } from '@/components/site-header';
import styles from '@/components/newsletter.module.css';

export const metadata: Metadata = {
  title: 'न्यूज़लेटर',
  description: 'UP24Network का न्यूज़लेटर ईमेल पर पाने के लिए सदस्यता लें।',
  alternates: { canonical: '/newsletter' },
};

export default function NewsletterPage() {
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" className={styles.page} lang="hi">
        <header className={styles.heading}>
          <h1>UP24Network न्यूज़लेटर</h1>
          <p>उत्तर प्रदेश और देश की चुनिंदा खबरें सीधे अपने ईमेल पर पाएं।</p>
        </header>
        <NewsletterSection variant="page" />
        <p className={styles.delivery}>
          सदस्यता ईमेल में भेजे गए लिंक से पुष्टि करने के बाद शुरू होती है। हर न्यूज़लेटर में सदस्यता रद्द करने का लिंक
          मिलेगा।
        </p>
      </main>
    </>
  );
}
