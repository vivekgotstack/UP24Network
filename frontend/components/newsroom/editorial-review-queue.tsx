'use client';

import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminWorkspace } from '@/components/newsroom/admin-workspace';
import { Button } from '@/components/ui/button';
import { type CmsError, type Account } from '@/lib/cms';
import {
  articleReviews,
  type Review,
  type ReviewDetail,
  type ReviewQueue,
  type ReviewState,
} from '@/lib/newsroom/reviews';
import { toDraft, type Draft } from '@/lib/newsroom/types';
import { useNewsroomResource, useSession } from '@/lib/session';
import styles from './editorial-review-queue.module.css';

type Decision = { review: Review; note?: string };

const states: Record<ReviewState, string> = {
  PENDING: 'Awaiting approval',
  APPROVED: 'Approved',
  RETURNED: 'Returned',
};
const fields: { key: keyof Draft; label: string }[] = [
  { key: 'title', label: 'Headline' },
  { key: 'slug', label: 'Article address' },
  { key: 'summary', label: 'Summary' },
  { key: 'category', label: 'Section' },
  { key: 'region', label: 'Region' },
  { key: 'city', label: 'City' },
  { key: 'body', label: 'Article body' },
  { key: 'image', label: 'Photograph' },
  { key: 'imageAlt', label: 'Photograph description' },
  { key: 'videoUrl', label: 'Video' },
  { key: 'youtubeId', label: 'YouTube video ID' },
  { key: 'sourceNotes', label: 'Private source notes' },
];
const dateTime = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

function ReviewComparison({ detail }: { detail: ReviewDetail }) {
  const current =
    detail.kind === 'UPDATE' && detail.current?.version === detail.articleVersion
      ? toDraft(detail.current)
      : null;
  const values = fields.flatMap(({ key, label }) => {
    const before = current?.[key] ?? '';
    const after = detail.input[key]?.trim() ?? '';
    if ((current && before.trim() === after) || (!current && !after)) return [];
    return [{ key, label, before, after }];
  });
  return (
    <section className={styles.comparison} aria-labelledby={`changes-${detail.id}`}>
      <h4 id={`changes-${detail.id}`}>{current ? 'Proposed changes' : 'Submitted article'}</h4>
      {values.length === 0 && <p>The submitted article matches the saved draft or article.</p>}
      {values.map(({ key, label, before, after }) => (
        <section className={styles.comparisonField} key={key} aria-label={label}>
          <h5>{label}</h5>
          <div className={current ? styles.comparisonValues : undefined}>
            {current && (
              <div className={styles.value}>
                <span>
                  {detail.current?.status === 'PUBLISHED' ? 'Current article' : 'Saved draft'}
                </span>
                <p
                  className={key === 'body' ? styles.longValue : undefined}
                  tabIndex={key === 'body' ? 0 : undefined}
                >
                  {before || 'Empty'}
                </p>
              </div>
            )}
            <div className={styles.value}>
              <span>Submitted</span>
              <p
                className={key === 'body' ? styles.longValue : undefined}
                tabIndex={key === 'body' ? 0 : undefined}
              >
                {after || 'Empty'}
              </p>
            </div>
          </div>
        </section>
      ))}
    </section>
  );
}

function ProposalDetails({ review, account }: { review: Review; account: Account }) {
  const detail = useNewsroomResource<ReviewDetail>(account, articleReviews.detailPath(review.id));
  return (
    <div className={styles.details} id={`proposal-${review.id}`}>
      <section className={styles.evidence} aria-labelledby={`evidence-${review.id}`}>
        <h4 id={`evidence-${review.id}`}>Verification and rights</h4>
        <p>{review.verificationNotes}</p>
        <p className={styles.muted}>
          The submitter confirmed facts, media rights, and editorial standards.
        </p>
      </section>
      {detail.isPending && <p role="status">Loading the article comparison…</p>}
      {detail.error && (
        <div className={styles.retry}>
          <p className="inline-error" role="alert">
            {detail.error.message}
          </p>
          <Button type="button" variant="outline" onClick={() => void detail.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {detail.data && (
        <>
          {review.state === 'PENDING' && detail.data.current?.version !== review.articleVersion && (
            <p className="inline-error" role="status">
              The saved article has changed since this submission. Return it so staff can submit an
              updated proposal.
            </p>
          )}
          <ReviewComparison detail={detail.data} />
        </>
      )}
    </div>
  );
}

export function EditorialReviewQueue() {
  const session = useSession();
  const account = session.data;
  const canReview = account?.role === 'ADMIN' && account.newsroomAccess;
  const client = useQueryClient();
  const [state, setState] = useState<ReviewState>('PENDING');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string>();
  const [returning, setReturning] = useState<string>();
  const [notice, setNotice] = useState('');
  const [noteError, setNoteError] = useState('');
  const feedback = useRef<HTMLDivElement>(null);
  const queue = useNewsroomResource<ReviewQueue>(
    account,
    articleReviews.queuePath(page, state),
    canReview === true,
    { refetchInterval: 30_000 },
  );
  const decision = useMutation<Review, CmsError, Decision>({
    mutationFn: ({ review, note }) =>
      note === undefined
        ? articleReviews.approve(review.id)
        : articleReviews.returnForChanges(review.id, note),
    onMutate: () => setNotice(''),
    onSuccess: async (review, variables) => {
      setReturning(undefined);
      setExpanded(undefined);
      setNotice(
        variables.note !== undefined
          ? 'The submission was returned for changes.'
          : review.kind === 'UPDATE'
            ? 'The changes are live.'
            : 'The report is published.',
      );
      await refresh(variables.note === undefined);
    },
    onError: (error) => {
      if (error.status === 409) void refresh(false);
      if (error.status === 401 || error.status === 403) void session.refetch();
    },
  });
  useEffect(() => {
    if (notice) feedback.current?.focus({ preventScroll: true });
  }, [notice]);

  function refresh(includeArticles: boolean) {
    return client.invalidateQueries({
      queryKey: ['newsroom', account?.id],
      predicate: ({ queryKey }) => {
        const path = queryKey[2];
        return (
          typeof path === 'string' &&
          (path.startsWith('admin/article-reviews') ||
            (includeArticles && path.startsWith('admin/articles')))
        );
      },
    });
  }

  function sendBack(event: SubmitEvent<HTMLFormElement>, review: Review) {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get('note') ?? '').trim();
    if (note.length < 12) {
      setNoteError('Describe what the submitter needs to fix in at least 12 characters.');
      return;
    }
    setNoteError('');
    decision.mutate({ review, note });
  }

  function showPage(next: number) {
    decision.reset();
    setExpanded(undefined);
    setReturning(undefined);
    setNoteError('');
    setNotice('');
    setPage(next);
  }

  return (
    <AdminWorkspace title="Editorial review" active="reviews">
      <div className={styles.queue}>
        <h2 className="sr-only">Article submissions</h2>
        <div className={styles.toolbar}>
          <label>
            Show submissions
            <select
              value={state}
              disabled={decision.isPending}
              onChange={(event) => {
                setState(event.target.value as ReviewState);
                showPage(1);
              }}
            >
              {Object.entries(states).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={queue.isFetching}
            onClick={() => void queue.refetch()}
          >
            Refresh
          </Button>
        </div>
        <div role="status" tabIndex={-1} ref={feedback}>
          {notice && <p className="cms-feedback">{notice}</p>}
        </div>
        {queue.error && (
          <p className="inline-error" role="alert">
            {queue.error.message}
          </p>
        )}
        {queue.isPending && <p role="status">Loading editorial submissions…</p>}
        {queue.data?.items.length === 0 && (
          <p className={styles.muted}>No {states[state].toLowerCase()} submissions on this page.</p>
        )}
        {queue.data?.items.map((review) => {
          const isExpanded = expanded === review.id;
          const isReturning = returning === review.id;
          const submitting = decision.isPending && decision.variables?.review.id === review.id;
          const decisionError = decision.variables?.review.id === review.id ? decision.error : null;
          return (
            <article
              className={styles.submission}
              key={review.id}
              aria-labelledby={`title-${review.id}`}
              aria-busy={submitting}
            >
              <header className={styles.heading}>
                <div>
                  <h3 id={`title-${review.id}`}>{review.title}</h3>
                  <p className={styles.muted}>
                    {review.kind === 'UPDATE' ? 'Published article update' : 'First publication'} ·{' '}
                    {review.submittedBy} ·{' '}
                    <time dateTime={review.submittedAt}>
                      {dateTime.format(new Date(review.submittedAt))} IST
                    </time>
                  </p>
                </div>
                <span className={styles.state} data-state={review.state}>
                  {states[review.state]}
                </span>
              </header>
              <p className={styles.summary}>{review.changeSummary}</p>
              {review.decisionNote && (
                <p className={styles.note}>
                  <strong>Return note</strong>
                  {review.decisionNote}
                </p>
              )}
              {review.decidedAt && (
                <p className={styles.muted}>
                  Decision recorded{' '}
                  <time dateTime={review.decidedAt}>
                    {dateTime.format(new Date(review.decidedAt))} IST
                  </time>
                </p>
              )}
              {decisionError && (
                <p className="inline-error" role="alert">
                  {decisionError.message}
                </p>
              )}
              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="outline"
                  aria-expanded={isExpanded}
                  aria-controls={isExpanded ? `proposal-${review.id}` : undefined}
                  onClick={() => setExpanded(isExpanded ? undefined : review.id)}
                >
                  {isExpanded ? 'Hide proposal' : 'Review proposal'}
                </Button>
                {review.state === 'PENDING' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={decision.isPending}
                      aria-expanded={isReturning}
                      aria-controls={isReturning ? `return-${review.id}` : undefined}
                      onClick={() => {
                        decision.reset();
                        setNoteError('');
                        setReturning(isReturning ? undefined : review.id);
                      }}
                    >
                      Return for changes
                    </Button>
                    <Button
                      type="button"
                      disabled={decision.isPending || decisionError?.status === 409}
                      onClick={() => decision.mutate({ review })}
                    >
                      {submitting && decision.variables?.note === undefined
                        ? 'Approving…'
                        : review.kind === 'UPDATE'
                          ? 'Approve & update'
                          : 'Approve & publish'}
                    </Button>
                  </>
                )}
              </div>
              {isReturning && (
                <form
                  className={styles.returnForm}
                  id={`return-${review.id}`}
                  onSubmit={(event) => sendBack(event, review)}
                >
                  <label htmlFor={`note-${review.id}`}>Changes required</label>
                  <textarea
                    id={`note-${review.id}`}
                    name="note"
                    rows={3}
                    required
                    minLength={12}
                    maxLength={2000}
                    aria-describedby={`note-help-${review.id}`}
                    aria-invalid={noteError ? true : undefined}
                    onChange={() => setNoteError('')}
                    disabled={decision.isPending}
                  />
                  <p className={styles.muted} id={`note-help-${review.id}`}>
                    Tell the submitter what to correct or verify.
                  </p>
                  {noteError && (
                    <p className="inline-error" role="alert">
                      {noteError}
                    </p>
                  )}
                  <div className={styles.actions}>
                    <Button type="submit" disabled={decision.isPending}>
                      {submitting && decision.variables?.note !== undefined
                        ? 'Returning…'
                        : 'Send back to staff'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={decision.isPending}
                      onClick={() => setReturning(undefined)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
              {isExpanded && account && <ProposalDetails review={review} account={account} />}
            </article>
          );
        })}
        {(page > 1 || queue.data?.hasNext) && (
          <nav className={styles.pagination} aria-label="Review pages">
            <Button
              type="button"
              variant="outline"
              disabled={page === 1 || decision.isPending}
              onClick={() => showPage(page - 1)}
            >
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              type="button"
              variant="outline"
              disabled={!queue.data?.hasNext || decision.isPending}
              onClick={() => showPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </div>
    </AdminWorkspace>
  );
}
