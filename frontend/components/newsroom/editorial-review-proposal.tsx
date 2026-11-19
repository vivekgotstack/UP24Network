'use client';

import { useId, useState, type SubmitEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { YouTubeStory } from '@/components/youtube-story';
import type { Account } from '@/lib/cms';
import { canonicalReelUrl } from '@/lib/instagram';
import { articleReviews, type Review, type ReviewDetail } from '@/lib/newsroom/reviews';
import { allowedMedia, toDraft, type Draft, type EnglishArticleDraft } from '@/lib/newsroom/types';
import { useNewsroomResource } from '@/lib/session';
import styles from './editorial-review-queue.module.css';

const fields: { key: Exclude<keyof Draft, 'english' | 'topicLines'>; label: string }[] = [
  { key: 'title', label: 'Headline' },
  { key: 'slug', label: 'Article address' },
  { key: 'summary', label: 'Summary' },
  { key: 'category', label: 'Section' },
  { key: 'region', label: 'Region' },
  { key: 'city', label: 'City' },
  { key: 'body', label: 'Article body' },
  { key: 'image', label: 'Photograph address' },
  { key: 'imageAlt', label: 'Photograph description' },
  { key: 'videoUrl', label: 'Video address' },
  { key: 'youtubeId', label: 'YouTube video ID' },
  { key: 'reelUrl', label: 'Instagram Reel address' },
  { key: 'mediaCredit', label: 'Public media credit' },
  { key: 'sourceNotes', label: 'Private source notes' },
];
const englishFields: { key: keyof EnglishArticleDraft; label: string }[] = [
  { key: 'title', label: 'English headline' },
  { key: 'summary', label: 'English summary' },
  { key: 'body', label: 'English report' },
  { key: 'imageAlt', label: 'English photograph description' },
];

function ReviewComparison({ detail }: { detail: ReviewDetail }) {
  const current =
    detail.kind === 'UPDATE' && detail.current?.version === detail.articleVersion
      ? toDraft(detail.current)
      : null;
  const values = fields.flatMap(({ key, label }) => {
    const before = current?.[key]?.trim() ?? '';
    const after = detail.input[key]?.trim() ?? (key === 'mediaCredit' ? before : '');
    return before === after ? [] : [{ key, label, before, after, long: key === 'body' }];
  });
  const beforeTopics = current?.topicLines.replaceAll('\n', ' · ') ?? '';
  const afterTopics = detail.input.tags?.join(' · ') ?? beforeTopics;
  const changes = [
    ...values,
    ...(beforeTopics === afterTopics
      ? []
      : [
          {
            key: 'tags',
            label: 'Topic tags',
            before: beforeTopics,
            after: afterTopics,
            long: false,
          },
        ]),
    ...englishFields.flatMap(({ key, label }) => {
      const before = current?.english[key].trim() ?? '';
      const after = detail.input.english ? (detail.input.english[key]?.trim() ?? '') : before;
      return before === after
        ? []
        : [{ key: `english-${key}`, label, before, after, long: key === 'body' }];
    }),
  ];
  return (
    <section className={styles.comparison} aria-labelledby={`changes-${detail.id}`}>
      <h5 id={`changes-${detail.id}`}>{current ? 'Proposed changes' : 'Submitted article'}</h5>
      {changes.length === 0 && <p>The submitted article matches the saved version.</p>}
      {changes.map(({ key, label, before, after, long }) => (
        <section className={styles.comparisonField} key={key} aria-label={label}>
          <h6>{label}</h6>
          <div className={current ? styles.comparisonValues : undefined}>
            {current && (
              <div className={styles.value}>
                <span>Current article</span>
                <p className={long ? styles.longValue : undefined} tabIndex={long ? 0 : undefined}>
                  {before || 'Empty'}
                </p>
              </div>
            )}
            <div className={styles.value}>
              <span>Submitted</span>
              <p className={long ? styles.longValue : undefined} tabIndex={long ? 0 : undefined}>
                {after || 'Empty'}
              </p>
            </div>
          </div>
        </section>
      ))}
    </section>
  );
}

function ProposedMedia({ detail }: { detail: ReviewDetail }) {
  const [failedPhoto, setFailedPhoto] = useState(false);
  const [failedVideo, setFailedVideo] = useState(false);
  const { title, image, imageAlt, videoUrl, youtubeId } = detail.input;
  const reelUrl = canonicalReelUrl(detail.input.reelUrl);
  const photo = !reelUrl && image && allowedMedia(image) ? image : '';
  const video = !reelUrl && videoUrl && allowedMedia(videoUrl, false) ? videoUrl : '';
  const youtube = !reelUrl && youtubeId && /^[A-Za-z0-9_-]{11}$/.test(youtubeId) ? youtubeId : '';
  if (!photo && !video && !youtube && !reelUrl) return null;
  return (
    <section className={styles.proposalMedia} aria-labelledby={`media-${detail.id}`}>
      <h5 id={`media-${detail.id}`}>Proposed media</h5>
      {reelUrl && (
        <a className="text-link" href={reelUrl} target="_blank" rel="noopener noreferrer">
          Open the original Reel on Instagram
        </a>
      )}
      {video ? (
        failedVideo ? (
          <p role="status">The proposed video could not be loaded.</p>
        ) : (
          <video
            className={styles.video}
            src={video}
            poster={photo || undefined}
            aria-label={title}
            controls
            playsInline
            preload="none"
            onError={() => setFailedVideo(true)}
          />
        )
      ) : (
        youtube && (
          <YouTubeStory
            videoId={youtube}
            title={title}
            thumbnail={photo.startsWith('/') ? photo : ''}
          />
        )
      )}
      {photo && (
        <figure>
          {failedPhoto ? (
            <p role="status">The proposed photograph could not be loaded.</p>
          ) : (
            <div className={styles.photograph}>
              <Image
                src={photo}
                alt={imageAlt || 'Proposed photograph'}
                fill
                unoptimized
                referrerPolicy="no-referrer"
                onError={() => setFailedPhoto(true)}
              />
            </div>
          )}
          {imageAlt && <figcaption className={styles.muted}>{imageAlt}</figcaption>}
        </figure>
      )}
    </section>
  );
}

export function ProposalDetails({
  review,
  account,
  checked,
  blocked,
  onCheck,
}: {
  review: Review;
  account: Account;
  checked: boolean;
  blocked: boolean;
  onCheck: (checked: boolean) => void;
}) {
  const detail = useNewsroomResource<ReviewDetail>(account, articleReviews.detailPath(review.id));
  const pending = review.state === 'PENDING';
  const stale = Boolean(detail.data && detail.data.current?.version !== review.articleVersion);
  return (
    <div className={styles.details} id={`proposal-${review.id}`}>
      <section className={styles.evidence} aria-labelledby={`evidence-${review.id}`}>
        <h5 id={`evidence-${review.id}`}>Verification and rights</h5>
        <p>{review.verificationNotes}</p>
        <p className={styles.muted}>
          The submitter confirmed facts, media rights, and editorial standards.
        </p>
      </section>
      {detail.isPending && <p role="status">Loading the submitted article…</p>}
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
          {pending && stale && (
            <p className="inline-error" role="status">
              The saved article has changed since submission. Return it so staff can submit an
              updated proposal.
            </p>
          )}
          <ProposedMedia detail={detail.data} />
          <ReviewComparison detail={detail.data} />
          {pending && !stale && (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={checked}
                disabled={blocked || Boolean(detail.error)}
                onChange={(event) => onCheck(event.target.checked)}
              />
              I checked the article and any media and verified they are ready to publish.
            </label>
          )}
        </>
      )}
    </div>
  );
}

export function ReviewNoteForm({
  label,
  help,
  submitLabel,
  blocked,
  onSubmit,
  onCancel,
}: {
  label: string;
  help: string;
  submitLabel: string;
  blocked: boolean;
  onSubmit: (note: string) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [error, setError] = useState('');

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get('note') ?? '').trim();
    if (note.length < 12) {
      setError('Enter at least 12 characters.');
      return;
    }
    setError('');
    onSubmit(note);
  }

  return (
    <form className={styles.returnForm} onSubmit={submit}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        name="note"
        rows={3}
        required
        minLength={12}
        maxLength={2000}
        aria-describedby={`${id}-help`}
        aria-invalid={error ? true : undefined}
        disabled={blocked}
        onChange={() => setError('')}
      />
      <p className={styles.muted} id={`${id}-help`}>
        {help}
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={blocked}>
          {blocked ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="outline" disabled={blocked} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
