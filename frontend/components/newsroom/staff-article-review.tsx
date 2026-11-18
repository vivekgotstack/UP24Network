'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { textLanguage } from '@/lib/language';
import { articleReviews, type Review } from '@/lib/newsroom/reviews';
import type { SaveArticle } from '@/lib/newsroom/types';
import styles from './staff-article-review.module.css';

const dates = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

const stateLabel: Record<Review['state'], string> = {
  PENDING: 'Awaiting admin review',
  APPROVED: 'Approved',
  RETURNED: 'Changes requested',
};

const checks = {
  factsVerified: {
    label: 'Facts and attribution checked',
    note: 'Verify names, dates, figures, quotations, and attribution against the sources recorded.',
  },
  rightsVerified: {
    label: 'Media rights and consent checked',
    note: 'Confirm permission, credit, and any required consent for each asset. Record if no media is included.',
  },
  standardsVerified: {
    label: 'Editorial and privacy standards checked',
    note: 'Review sensitive details, confidential information, and the opportunity to respond where applicable.',
  },
} satisfies Record<keyof import('@/lib/newsroom/reviews').ReviewSubmission['checks'], {
  label: string;
  note: string;
}>;

export function StaffReviewStatus({ reviews, latestInput, canResume, version, onResume }: {
  reviews: Review[];
  latestInput?: SaveArticle | null;
  canResume: boolean;
  version: number | null;
  onResume: (input: SaveArticle) => void;
}) {
  const latest = reviews[0];
  if (!latest) return null;

  const returned = latest.state === 'RETURNED';
  const sameVersion = latest.articleVersion === version;
  return (
    <section className={styles.status} aria-label="Editorial review status">
      <div className={styles.statusHeader}>
        <strong className={styles.reviewBadge} data-state={latest.state} role="status">
          {stateLabel[latest.state]}
        </strong>
        <span className={styles.meta}>
          <time dateTime={latest.submittedAt}>{dates.format(new Date(latest.submittedAt))} IST</time>
          {' · '}Article version {latest.articleVersion}
        </span>
      </div>
      <p className={styles.prose}>{latest.changeSummary}</p>
      {latest.state === 'PENDING' && (
        <p className={styles.meta}>
          The submitted version is locked while the administrator reviews it.{' '}
          {latest.kind === 'UPDATE' ? 'Readers still see the current published report.' : 'The draft stays private.'}
        </p>
      )}
      {returned && latest.decisionNote && (
        <div className={styles.decision}>
          <h3>Review feedback</h3>
          <p className={styles.prose}>{latest.decisionNote}</p>
        </div>
      )}
      {returned && latestInput && (
        sameVersion ? (
          <div>
            <Button type="button" variant="outline" disabled={!canResume} onClick={() => onResume(latestInput)}>
              Load returned proposal
            </Button>
            {!canResume && <p className={styles.meta}>Finish your current edits before loading the returned proposal.</p>}
          </div>
        ) : (
          <details className={styles.history}>
            <summary>Read returned proposal</summary>
            <p className={styles.meta}>
              The article version has changed. Review the previous proposal and apply the changes that still belong in a new request.
            </p>
            <div className={styles.proposalBody}>
              <h3 lang={textLanguage(latestInput.title)}>{latestInput.title}</h3>
              <p className={styles.prose} lang={textLanguage(latestInput.summary)}>{latestInput.summary}</p>
              <p className={styles.prose} lang={textLanguage(latestInput.body)}>{latestInput.body}</p>
            </div>
          </details>
        )
      )}
      {reviews.length > 1 && (
        <details className={styles.history}>
          <summary>Earlier requests</summary>
          <ul>
            {reviews.slice(1).map((review) => (
              <li key={review.id}>
                <strong>{stateLabel[review.state]}</strong>
                <time dateTime={review.submittedAt}>{dates.format(new Date(review.submittedAt))} IST</time>
                <p className={styles.prose}>{review.decisionNote || review.changeSummary}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export function StaffReviewSubmission({ articleId, input, published, onBack, onSubmitted, onConflict, onEvidenceChange }: {
  articleId: string;
  input: SaveArticle | null;
  published: boolean;
  onBack: () => void;
  onSubmitted: (review: Review) => void;
  onConflict: (reason: unknown) => void;
  onEvidenceChange: (dirty: boolean) => void;
}) {
  const [changeSummary, setChangeSummary] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [confirmed, setConfirmed] = useState({ factsVerified: false, rightsVerified: false, standardsVerified: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (input) heading.current?.focus();
  }, [input]);

  if (input === null || input.version === null) return null;
  const proposal = input;
  const articleVersion = input.version;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const summary = changeSummary.trim();
    const evidence = verificationNotes.trim();
    if (summary.length < 20 || evidence.length < 40 || Object.values(confirmed).includes(false)) {
      setError('Provide a substantive summary and verification record, then complete the checklist.');
      return;
    }
    setBusy(true);
    try {
      const review = await articleReviews.submit(articleId, {
        articleVersion,
        input: proposal,
        changeSummary: summary,
        verificationNotes: evidence,
        checks: confirmed,
      });
      setChangeSummary('');
      setVerificationNotes('');
      setConfirmed({ factsVerified: false, rightsVerified: false, standardsVerified: false });
      onEvidenceChange(false);
      onSubmitted(review);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The review request could not be submitted.');
      onConflict(reason);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`${styles.submission} cms-form`} onSubmit={submit} aria-busy={busy}>
      <header className={styles.intro}>
        <h3 ref={heading} tabIndex={-1}>{published ? 'Submit a proposed update' : 'Request publication'}</h3>
        <p>The administrator reviews this version and its supporting evidence before it can go live.</p>
      </header>
      <details className={styles.preview}>
        <summary>Review submitted article text</summary>
        <div className={styles.proposalBody}>
          <h4 lang={textLanguage(proposal.title)}>{proposal.title}</h4>
          <p className={styles.prose} lang={textLanguage(proposal.summary)}>{proposal.summary}</p>
          <p className={styles.prose} lang={textLanguage(proposal.body)}>{proposal.body}</p>
        </div>
      </details>
      <fieldset className={styles.evidence} disabled={busy}>
        <legend>Evidence for the administrator</legend>
        <label>
          {published ? 'Summary of changes' : 'Publication rationale'}
          <textarea
            name="changeSummary"
            required
            minLength={20}
            maxLength={2000}
            rows={3}
            value={changeSummary}
            onChange={(event) => {
              setChangeSummary(event.target.value);
              onEvidenceChange(true);
            }}
          />
          <span className="field-help">
            {published ? 'Identify the changed details and explain why the update is needed.' : 'Explain the public interest and why the report is ready.'} At least 20 characters.
          </span>
        </label>
        <label>
          Verification and rights record
          <textarea
            name="verificationNotes"
            required
            minLength={40}
            maxLength={4000}
            rows={5}
            value={verificationNotes}
            onChange={(event) => {
              setVerificationNotes(event.target.value);
              onEvidenceChange(true);
            }}
          />
          <span className="field-help">Record the checks completed, source links or references, and media permissions or restrictions. At least 40 characters.</span>
        </label>
      </fieldset>
      <fieldset className={styles.checklist} disabled={busy}>
        <legend>Editorial sign-off</legend>
        {(Object.keys(checks) as (keyof typeof checks)[]).map((key) => (
          <label className={styles.check} key={key}>
            <input
              type="checkbox"
              checked={confirmed[key]}
              required
              onChange={(event) => {
                setConfirmed({ ...confirmed, [key]: event.target.checked });
                onEvidenceChange(true);
              }}
            />
            <span>
              <strong>{checks[key].label}</strong>
              <span className={styles.meta}>{checks[key].note}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onBack}>Back to article</Button>
      </div>
    </form>
  );
}
