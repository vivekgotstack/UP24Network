'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminWorkspace } from '@/components/newsroom/admin-workspace';
import { ProposalDetails, ReviewNoteForm } from '@/components/newsroom/editorial-review-proposal';
import { Button } from '@/components/ui/button';
import type { Account, CmsError } from '@/lib/cms';
import {
  articleReviews,
  type Review,
  type ReviewBatch,
  type ReviewBatchDetail,
  type ReviewBatchQueue,
  type ReviewState,
} from '@/lib/newsroom/reviews';
import { useNewsroomResource, useSession } from '@/lib/session';
import styles from './editorial-review-queue.module.css';

type Decision =
  | { kind: 'approve'; ids: string[] }
  | { kind: 'return'; reviewId: string; note: string }
  | { kind: 'reward'; note: string };

const reviewStates: Record<ReviewState, string> = {
  PENDING: 'Awaiting approval',
  APPROVED: 'Approved',
  RETURNED: 'Returned',
};
const dateTime = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});
const dayFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'UTC' });

function ReviewTime({ value }: { value: string }) {
  return <time dateTime={value}>{dateTime.format(new Date(value))} IST</time>;
}

function ReviewCard({
  review,
  account,
  expanded,
  returning,
  checked,
  blocked,
  onToggle,
  onReturnToggle,
  onReturn,
  onCheck,
}: {
  review: Review;
  account: Account;
  expanded: boolean;
  returning: boolean;
  checked: boolean;
  blocked: boolean;
  onToggle: () => void;
  onReturnToggle: () => void;
  onReturn: (note: string) => void;
  onCheck: (value: boolean) => void;
}) {
  return (
    <article className={styles.submission} aria-labelledby={`title-${review.id}`}>
      <header className={styles.heading}>
        <div>
          <h4 id={`title-${review.id}`}>{review.title}</h4>
          <p className={styles.muted}>
            {review.kind === 'UPDATE' ? 'Published article update' : 'First publication'} ·{' '}
            <ReviewTime value={review.submittedAt} />
          </p>
        </div>
        <span className={styles.state} data-state={checked ? 'APPROVED' : review.state}>
          {checked && review.state === 'PENDING' ? 'Checked' : reviewStates[review.state]}
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
          Decision recorded <ReviewTime value={review.decidedAt} />
        </p>
      )}
      <div className={styles.actions}>
        <Button
          type="button"
          variant="outline"
          aria-expanded={expanded}
          aria-controls={expanded ? `proposal-${review.id}` : undefined}
          onClick={onToggle}
        >
          {expanded ? 'Hide proposal' : 'Review proposal'}
        </Button>
        {review.state === 'PENDING' && (
          <Button
            type="button"
            variant="outline"
            aria-expanded={returning}
            disabled={blocked}
            onClick={onReturnToggle}
          >
            Return for changes
          </Button>
        )}
      </div>
      {expanded && (
        <ProposalDetails
          review={review}
          account={account}
          checked={checked}
          blocked={blocked}
          onCheck={onCheck}
        />
      )}
      {returning && review.state === 'PENDING' && (
        <ReviewNoteForm
          label="Changes required"
          help="Tell the contributor what to correct or verify."
          submitLabel="Send back to staff"
          blocked={blocked}
          onSubmit={onReturn}
          onCancel={onReturnToggle}
        />
      )}
    </article>
  );
}

function BatchReview({ batch, account }: { batch: ReviewBatch; account: Account }) {
  const client = useQueryClient();
  const session = useSession();
  const [expanded, setExpanded] = useState<string>();
  const [returning, setReturning] = useState<string>();
  const [rewarding, setRewarding] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState('');
  const feedback = useRef<HTMLDivElement>(null);
  const { contributorId, day } = batch;
  const detail = useNewsroomResource<ReviewBatchDetail>(
    account,
    articleReviews.batchPath(contributorId, day),
    true,
    { refetchInterval: 30_000 },
  );
  const current = detail.data?.batch ?? batch;
  const pendingIds =
    detail.data?.items.filter(({ state }) => state === 'PENDING').map(({ id }) => id) ?? [];
  const checkedCount = pendingIds.filter((id) => checked.has(id)).length;
  const decision = useMutation<string, CmsError, Decision>({
    mutationFn: async (action) => {
      if (action.kind === 'approve') {
        const { count } = await articleReviews.approveBatch(contributorId, day, action.ids);
        return count === 1
          ? 'One submission approved and published.'
          : `${count} submissions approved and published.`;
      }
      if (action.kind === 'return') {
        await articleReviews.returnForChanges(action.reviewId, action.note);
        return 'The submission was returned for changes.';
      }
      await articleReviews.recordReward(contributorId, day, action.note);
      return 'The reward was recorded.';
    },
    onMutate: () => {
      setNotice('');
    },
    onSuccess: async (message, action) => {
      setNotice(message);
      setReturning(undefined);
      setRewarding(false);
      if (action.kind === 'approve') {
        setChecked(new Set());
        setExpanded(undefined);
      } else if (action.kind === 'return') {
        check(action.reviewId, false);
      }
      await refresh(action.kind === 'approve');
    },
    onError: (error, action) => {
      if (error.status === 409) {
        if (action.kind === 'approve') setChecked(new Set());
        void refresh(false);
      }
      if (error.status === 401 || error.status === 403) void session.refetch();
    },
  });
  useEffect(() => {
    if (notice) feedback.current?.focus({ preventScroll: true });
  }, [notice]);

  function refresh(includeArticles: boolean) {
    return client.invalidateQueries({
      queryKey: ['newsroom', account.id],
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

  function check(id: string, value: boolean) {
    setChecked((existing) => {
      const next = new Set(existing);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className={styles.batchContent} id={`batch-${contributorId}-${day}`}>
      {detail.isPending && <p role="status">Loading the daily batch…</p>}
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
      <div className={styles.actions}>
        {current.rewardedAt && (
          <p>
            Reward recorded for {current.rewardedCount} approved submissions on{' '}
            <ReviewTime value={current.rewardedAt} />.
          </p>
        )}
        {current.closedAt && current.approvedCount > 0 && !current.rewardedAt && (
          <Button
            type="button"
            variant="outline"
            disabled={decision.isPending}
            aria-expanded={rewarding}
            onClick={() => {
              decision.reset();
              setRewarding(!rewarding);
            }}
          >
            Record reward
          </Button>
        )}
      </div>
      {current.rewardNote && (
        <p className={styles.note}>
          <strong>Reward note</strong>
          {current.rewardNote}
        </p>
      )}
      {rewarding && !current.rewardedAt && (
        <ReviewNoteForm
          label="Reward note"
          help="Enter the amount or reference for your records. Payment is handled separately."
          submitLabel="Save reward record"
          blocked={decision.isPending}
          onSubmit={(note) => decision.mutate({ kind: 'reward', note })}
          onCancel={() => setRewarding(false)}
        />
      )}
      {detail.data?.items.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          account={account}
          expanded={expanded === review.id}
          returning={returning === review.id}
          checked={checked.has(review.id)}
          blocked={decision.isPending}
          onToggle={() => setExpanded(expanded === review.id ? undefined : review.id)}
          onReturnToggle={() => {
            decision.reset();
            setReturning(returning === review.id ? undefined : review.id);
          }}
          onReturn={(note) => decision.mutate({ kind: 'return', reviewId: review.id, note })}
          onCheck={(value) => check(review.id, value)}
        />
      ))}
      <div className={styles.decisionFeedback} role="status" tabIndex={-1} ref={feedback}>
        {notice && <p className="cms-feedback">{notice}</p>}
      </div>
      {decision.error && (
        <p className="inline-error" role="alert">
          {decision.error.message}
        </p>
      )}
      {pendingIds.length > 0 && (
        <div className={styles.approval}>
          <div>
            <p>
              <strong>
                {checkedCount} of {pendingIds.length} pending submissions checked
              </strong>
            </p>
            <p className={styles.muted}>
              {current.ready
                ? 'Review the pending proposals and return any that need changes.'
                : 'This batch can be approved on its scheduled day.'}
            </p>
          </div>
          <Button
            type="button"
            disabled={
              !current.ready ||
              checkedCount !== pendingIds.length ||
              decision.isPending ||
              Boolean(detail.error)
            }
            onClick={() => decision.mutate({ kind: 'approve', ids: pendingIds })}
          >
            {decision.isPending && decision.variables?.kind === 'approve'
              ? 'Publishing batch…'
              : 'Approve & publish batch'}
          </Button>
        </div>
      )}
    </div>
  );
}

export function EditorialReviewQueue() {
  const account = useSession().data;
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string>();
  const queue = useNewsroomResource<ReviewBatchQueue>(
    account,
    articleReviews.batchesPath(page),
    account?.role === 'ADMIN' && account.newsroomAccess === true,
    { refetchInterval: 30_000 },
  );
  return (
    <AdminWorkspace title="Editorial review" active="reviews">
      <div className={styles.queue}>
        <div className={styles.toolbar}>
          <h2>Daily batches</h2>
          <Button
            type="button"
            variant="outline"
            disabled={queue.isFetching}
            onClick={() => void queue.refetch()}
          >
            Refresh
          </Button>
        </div>
        {queue.isPending && <p role="status">Loading daily batches…</p>}
        {queue.error && (
          <p className="inline-error" role="alert">
            {queue.error.message}
          </p>
        )}
        {queue.data?.items.length === 0 && (
          <p className={styles.muted}>No daily submissions on this page.</p>
        )}
        {queue.data?.items.map((batch) => {
          const key = `${batch.contributorId}-${batch.day}`;
          const open = expanded === key;
          return (
            <section className={styles.batch} key={key} aria-labelledby={`title-${key}`}>
              <div className={styles.batchHeading}>
                <div>
                  <h3 id={`title-${key}`}>{batch.contributor}</h3>
                  <p className={styles.muted}>
                    <time dateTime={batch.day}>
                      {dayFormat.format(new Date(`${batch.day}T00:00:00Z`))}
                    </time>{' '}
                    · IST
                  </p>
                  <p>
                    {batch.pendingCount} pending · {batch.approvedCount} approved ·{' '}
                    {batch.returnedCount} returned
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  aria-expanded={open}
                  aria-controls={open ? `batch-${key}` : undefined}
                  onClick={() => setExpanded(open ? undefined : key)}
                >
                  {open ? 'Close batch' : 'Review batch'}
                </Button>
              </div>
              {open && account && <BatchReview batch={batch} account={account} />}
            </section>
          );
        })}
        {(page > 1 || queue.data?.hasNext) && (
          <nav className={styles.pagination} aria-label="Review pages">
            <Button
              type="button"
              variant="outline"
              disabled={page === 1}
              onClick={() => {
                setExpanded(undefined);
                setPage(page - 1);
              }}
            >
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              type="button"
              variant="outline"
              disabled={!queue.data?.hasNext}
              onClick={() => {
                setExpanded(undefined);
                setPage(page + 1);
              }}
            >
              Next
            </Button>
          </nav>
        )}
      </div>
    </AdminWorkspace>
  );
}
