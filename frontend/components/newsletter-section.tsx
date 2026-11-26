import Link from 'next/link';
import { Suspense } from 'react';
import { NewsletterForm } from '@/components/newsletter-form';
import { Button } from '@/components/ui/button';
import { getNewsletterAvailability } from '@/lib/publication-api';
import { copy, type SiteLocale } from '@/lib/locale';
import styles from './newsletter.module.css';

async function Signup({ locale }: { locale: SiteLocale }) {
  if (!(await getNewsletterAvailability())) {
    return <p className={styles.notice}>{copy(locale, 'नई न्यूज़लेटर सदस्यता अभी उपलब्ध नहीं है।', 'New newsletter subscriptions are currently unavailable.')}</p>;
  }
  return <NewsletterForm locale={locale} />;
}

export function NewsletterSection({ variant = 'compact', locale = 'hi' }: { variant?: 'compact' | 'page'; locale?: SiteLocale }) {
  if (variant === 'page') {
    return (
      <section id="newsletter-signup" className={styles.signup} aria-label={copy(locale, 'न्यूज़लेटर सदस्यता', 'Newsletter subscription')} lang={locale}>
        <Suspense fallback={<p role="status">{copy(locale, 'सदस्यता फ़ॉर्म लोड हो रहा है…', 'Loading the signup form…')}</p>}>
          <Signup locale={locale} />
        </Suspense>
      </section>
    );
  }
  return (
    <section className={styles.footer} aria-label={copy(locale, 'TheMorningExpress न्यूज़लेटर', 'TheMorningExpress newsletter')} lang={locale}>
      <div>
        <h2>{copy(locale, 'न्यूज़लेटर', 'Newsletter')}</h2>
        <p>{copy(locale, 'उत्तर प्रदेश और देश की चुनिंदा खबरें अपने ईमेल पर पाएँ।', 'Get selected stories from Uttar Pradesh and across India in your inbox.')}</p>
      </div>
      <Button asChild size="lg">
        <Link href="/newsletter">{copy(locale, 'न्यूज़लेटर देखें', 'See newsletter')}</Link>
      </Button>
    </section>
  );
}
