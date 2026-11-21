'use client';

import Link from 'next/link';
import { useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cms, CmsError } from '@/lib/cms';
import { correspondenceTopics, type CorrespondenceTopic } from '@/lib/correspondence';
import { copy, type SiteLocale } from '@/lib/locale';

const hindiTopics: Record<CorrespondenceTopic, string> = {
  GENERAL: 'सामान्य प्रश्न',
  TIP: 'खबर की सूचना',
  CORRECTION: 'सुधार का अनुरोध',
  COMPLAINT: 'संपादकीय शिकायत',
  PRIVACY: 'गोपनीयता अनुरोध',
  ADVERTISING: 'विज्ञापन संबंधी प्रश्न',
};

export function ReaderContactForm({
  topic,
  locale,
  reference,
}: {
  topic?: CorrespondenceTopic;
  locale: SiteLocale;
  reference?: { title: string; url: string };
}) {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const heading = topic
    ? copy(locale, hindiTopics[topic], correspondenceTopics[topic])
    : copy(locale, 'संदेश भेजें', 'Send us a message');
  const referenceText = reference
    ? `\n\n${copy(locale, 'संबंधित खबर', 'Related article')} · ${decodeURI(reference.url)}`
    : '';

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setSubmitting(true);
    setSent(false);
    setError('');
    try {
      const message = String(fields.get('message') ?? '').trim();
      if (!message) {
        setError(copy(locale, 'कृपया संदेश लिखें।', 'Enter a message.'));
        return;
      }
      await cms<void>('publication/contact', 'POST', {
        topic: topic ?? fields.get('topic'),
        name: String(fields.get('name') ?? '').trim(),
        email: String(fields.get('email') ?? '').trim(),
        subject: String(fields.get('subject') ?? '').trim(),
        message: message + referenceText,
      });
      form.reset();
      setSent(true);
    } catch (reason) {
      setError(
        reason instanceof CmsError && reason.status === 429
          ? copy(locale, 'कृपया कुछ देर बाद दोबारा कोशिश करें।', 'Try again in a little while.')
          : reason instanceof CmsError && reason.status === 400
            ? copy(
                locale,
                'सभी ज़रूरी जानकारी और ईमेल पता जाँचें।',
                'Check that each field is complete and your email address is valid.',
              )
            : copy(
                locale,
                'संदेश नहीं भेजा जा सका। दोबारा कोशिश करें।',
                'Your message could not be sent. Please try again.',
              ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="reader-contact" aria-labelledby="reader-contact-title">
      <h2 id="reader-contact-title">{heading}</h2>
      {reference && (
        <p>
          {copy(locale, 'संबंधित खबर', 'Related article')} ·{' '}
          <Link href={`${reference.url}?lang=${locale}`}>{reference.title}</Link>
        </p>
      )}
      <form className="reader-contact-form" onSubmit={submit} aria-busy={submitting}>
        <fieldset disabled={submitting}>
          {!topic && (
            <label>
              {copy(locale, 'विषय का प्रकार', 'Topic')}
              <select name="topic" defaultValue="GENERAL">
                {Object.entries(correspondenceTopics).map(([value, label]) => (
                  <option key={value} value={value}>
                    {copy(locale, hindiTopics[value as CorrespondenceTopic], label)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="reader-contact-fields">
            <label>
              {copy(locale, 'नाम', 'Name')}
              <input name="name" autoComplete="name" maxLength={100} required />
            </label>
            <label>
              {copy(locale, 'जवाब के लिए ईमेल', 'Reply email')}
              <input name="email" type="email" autoComplete="email" maxLength={254} required />
            </label>
          </div>
          <label>
            {copy(locale, 'शीर्षक', 'Subject')}
            <input name="subject" maxLength={160} required />
          </label>
          <label>
            {copy(locale, 'संदेश', 'Message')}
            <textarea
              name="message"
              rows={6}
              maxLength={4000 - referenceText.length}
              aria-describedby="contact-message-help"
              required
            />
          </label>
          <p id="contact-message-help">
            {copy(
              locale,
              reference
                ? 'बताएं कि खबर में क्या सुधार चाहिए। पासवर्ड और संवेदनशील दस्तावेज़ न भेजें।'
                : 'किसी खबर से जुड़ा संदेश हो तो उसका लिंक दें। पासवर्ड और संवेदनशील दस्तावेज़ न भेजें।',
              reference
                ? 'Explain what needs correcting. Leave out passwords and sensitive documents.'
                : 'Include the article URL if your message concerns a story. Leave out passwords and sensitive documents.',
            )}
          </p>
          <p>
            {copy(
              locale,
              'हम आपकी जानकारी का उपयोग समीक्षा और जवाब के लिए करते हैं।',
              'We use your details to review and respond.',
            )}{' '}
            <Link href="/privacy">{copy(locale, 'गोपनीयता नीति', 'Privacy policy')}</Link>
          </p>
          <Button type="submit" size="lg">
            {submitting
              ? copy(locale, 'भेज रहे हैं…', 'Sending…')
              : copy(locale, 'संदेश भेजें', 'Send message')}
          </Button>
        </fieldset>
        <div role="status">
          {sent && (
            <p>
              {copy(
                locale,
                'UP24Network को आपका संदेश मिला।',
                'Your message was received by UP24Network.',
              )}
            </p>
          )}
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
