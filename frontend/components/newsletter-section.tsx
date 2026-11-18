import Link from 'next/link';
import { Suspense } from 'react';
import { NewsletterForm } from '@/components/newsletter-form';
import { Button } from '@/components/ui/button';
import { getNewsletterAvailability } from '@/lib/publication-api';
import styles from './newsletter.module.css';

async function Signup() {
  if (!(await getNewsletterAvailability())) {
    return <p className={styles.notice}>नई न्यूज़लेटर सदस्यता अभी उपलब्ध नहीं है।</p>;
  }
  return <NewsletterForm />;
}

export function NewsletterSection({ variant = 'compact' }: { variant?: 'compact' | 'page' }) {
  if (variant === 'page') {
    return (
      <section id="newsletter-signup" className={styles.signup} aria-label="न्यूज़लेटर सदस्यता">
        <Suspense fallback={<p role="status">सदस्यता फ़ॉर्म लोड हो रहा है…</p>}>
          <Signup />
        </Suspense>
      </section>
    );
  }
  return (
    <section className={styles.footer} aria-label="UP24Network न्यूज़लेटर" lang="hi">
      <div>
        <h2>न्यूज़लेटर</h2>
        <p>उत्तर प्रदेश और देश की चुनिंदा खबरें अपने ईमेल पर पाएं।</p>
      </div>
      <Button asChild size="lg">
        <Link href="/newsletter">न्यूज़लेटर देखें</Link>
      </Button>
    </section>
  );
}
