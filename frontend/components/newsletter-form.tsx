'use client';

import Link from 'next/link';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cms, CmsError } from '@/lib/cms';
import { copy, type SiteLocale } from '@/lib/locale';
import styles from './newsletter.module.css';

export function NewsletterForm({ locale }: { locale: SiteLocale }) {
  const hintId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<'email' | 'retry' | 'failed' | null>(null);

  async function subscribe(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || accepted) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') ?? '').trim();
    if (!email || fields.get('consent') !== 'on') return;
    setSubmitting(true);
    setError(null);
    try {
      await cms<void>('publication/newsletter', 'POST', { email });
      setAccepted(true);
    } catch (failure) {
      const status = failure instanceof CmsError ? failure.status : 0;
      setError(status === 400 ? 'email' : status === 429 ? 'retry' : 'failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {!accepted && (
        <form className={styles.form} onSubmit={subscribe} aria-busy={submitting}>
          <fieldset className={styles.form} disabled={submitting}>
            <label className={styles.email}>
              {copy(locale, 'ईमेल पता', 'Email address')}
              <input
                type="email"
                name="email"
                autoComplete="email"
                spellCheck={false}
                maxLength={254}
                aria-describedby={hintId}
                required
              />
            </label>
            <label className={styles.consent}>
              <input name="consent" type="checkbox" required />
              <span>{copy(locale, 'मैं TheMorningExpress का न्यूज़लेटर ईमेल पर पाने के लिए सहमत हूँ।', 'I agree to receive TheMorningExpress’s newsletter by email.')}</span>
            </label>
            <p id={hintId} className={styles.hint}>
              {copy(locale, 'हम आपका ईमेल सदस्यता की पुष्टि और न्यूज़लेटर भेजने के लिए इस्तेमाल करते हैं।', 'We use your email to confirm your subscription and send the newsletter.')}{' '}
              <Link href="/privacy">{copy(locale, 'गोपनीयता नीति', 'Privacy policy')}</Link>
            </p>
            <Button type="submit" size="lg" className={styles.submit}>
              {submitting ? copy(locale, 'अनुरोध भेज रहे हैं…', 'Sending…') : copy(locale, 'सदस्यता लें', 'Subscribe')}
            </Button>
          </fieldset>
        </form>
      )}
      <div role="status">
        {accepted && (
          <p className={styles.notice}>
            {copy(locale, 'सदस्यता पूरी करने के लिए अपना इनबॉक्स देखें और पुष्टिकरण लिंक खोलें।', 'Check your inbox and open the confirmation link to finish subscribing.')}
          </p>
        )}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error === 'email'
            ? copy(locale, 'कृपया अपना ईमेल पता जाँचें।', 'Check your email address.')
            : error === 'retry'
              ? copy(locale, 'कृपया कुछ देर बाद दोबारा कोशिश करें।', 'Try again in a little while.')
              : copy(locale, 'सदस्यता का अनुरोध पूरा नहीं हुआ। बाद में दोबारा कोशिश करें।', 'We could not submit your signup. Try again later.')}
        </p>
      )}
    </>
  );
}
