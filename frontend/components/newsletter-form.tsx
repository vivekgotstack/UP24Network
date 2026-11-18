'use client';

import Link from 'next/link';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cms, CmsError } from '@/lib/cms';
import styles from './newsletter.module.css';

export function NewsletterForm() {
  const hintId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  async function subscribe(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || accepted) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') ?? '').trim();
    if (!email || fields.get('consent') !== 'on') return;
    setSubmitting(true);
    setError('');
    try {
      await cms<void>('publication/newsletter', 'POST', { email });
      setAccepted(true);
    } catch (failure) {
      const status = failure instanceof CmsError ? failure.status : 0;
      if (status === 400) setError('कृपया अपना ईमेल पता जाँचें।');
      else if (status === 429) setError('कृपया कुछ देर बाद दोबारा कोशिश करें।');
      else setError('सदस्यता का अनुरोध पूरा नहीं हो सका। कृपया बाद में दोबारा कोशिश करें।');
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
              ईमेल पता
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
              <span>मैं UP24Network का न्यूज़लेटर ईमेल पर पाने के लिए सहमत हूँ।</span>
            </label>
            <p id={hintId} className={styles.hint}>
              हम आपका ईमेल सदस्यता की पुष्टि और न्यूज़लेटर भेजने के लिए इस्तेमाल करते हैं।{' '}
              <Link href="/privacy">गोपनीयता नीति</Link>
            </p>
            <Button type="submit" size="lg" className={styles.submit}>
              {submitting ? 'अनुरोध भेजा जा रहा है…' : 'सदस्यता लें'}
            </Button>
          </fieldset>
        </form>
      )}
      <div role="status">
        {accepted && (
          <p className={styles.notice}>
            सदस्यता पूरी करने के लिए अपना इनबॉक्स देखें और पुष्टिकरण लिंक मिलने पर उस पर क्लिक करें।
          </p>
        )}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
