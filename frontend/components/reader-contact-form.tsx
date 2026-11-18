'use client';

import Link from 'next/link';
import { useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cms, CmsError } from '@/lib/cms';
import { correspondenceTopics, type CorrespondenceTopic } from '@/lib/correspondence';

export function ReaderContactForm({ topic }: { topic?: CorrespondenceTopic }) {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const heading = topic ? correspondenceTopics[topic] : 'Send us a message';

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setSubmitting(true);
    setSent(false);
    setError('');
    try {
      await cms<void>('publication/contact', 'POST', {
        topic: topic ?? fields.get('topic'),
        name: String(fields.get('name') ?? '').trim(),
        email: String(fields.get('email') ?? '').trim(),
        subject: String(fields.get('subject') ?? '').trim(),
        message: String(fields.get('message') ?? '').trim(),
      });
      form.reset();
      setSent(true);
    } catch (reason) {
      setError(
        reason instanceof CmsError && reason.status === 429
          ? reason.message
          : reason instanceof CmsError && reason.status === 400
            ? 'Check that each field is complete and your email address is valid.'
            : 'Your message could not be sent. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="reader-contact" aria-labelledby="reader-contact-title">
      <h2 id="reader-contact-title">{heading}</h2>
      <form className="reader-contact-form" onSubmit={submit} aria-busy={submitting}>
        <fieldset disabled={submitting}>
          {!topic && (
            <label>
              Topic
              <select name="topic" defaultValue="GENERAL">
                {Object.entries(correspondenceTopics).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="reader-contact-fields">
            <label>
              Name
              <input name="name" autoComplete="name" maxLength={100} required />
            </label>
            <label>
              Reply email
              <input name="email" type="email" autoComplete="email" maxLength={254} required />
            </label>
          </div>
          <label>
            Subject
            <input name="subject" maxLength={160} required />
          </label>
          <label>
            Message
            <textarea
              name="message"
              rows={6}
              maxLength={4000}
              aria-describedby="contact-message-help"
              required
            />
          </label>
          <p id="contact-message-help">
            Include the article URL if your message concerns a story. Leave out passwords and
            sensitive documents.
          </p>
          <p>
            We use your details to review and respond. Read our{' '}
            <Link href="/privacy">privacy policy</Link>.
          </p>
          <Button type="submit" size="lg">
            {submitting ? 'Sending…' : 'Send message'}
          </Button>
        </fieldset>
        <div role="status">{sent && <p>Your message was received by UP24Network.</p>}</div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
