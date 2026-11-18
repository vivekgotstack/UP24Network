'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArticleConflict } from '@/components/newsroom/article-conflict';
import {
  StaffReviewStatus,
  StaffReviewSubmission,
} from '@/components/newsroom/staff-article-review';
import { cms, CmsError } from '@/lib/cms';
import { useSession, useNewsroomResource } from '@/lib/session';
import { MediaUpload } from '@/components/newsroom/media-upload';
import { VideoUpload } from '@/components/newsroom/video-upload';
import { defaultWorkflow, type WorkflowPolicy } from '@/lib/newsroom/workflows';
import { articleReviews, type Review, type ReviewHistory } from '@/lib/newsroom/reviews';
import styles from './article-admin.module.css';

import { sections } from '@/lib/sections';
import { cities, regions } from '@/lib/regions';
import {
  toDraft,
  slugify,
  videoId,
  allowedMedia,
  type Draft,
  type ManagedArticle,
  type SaveArticle,
} from '@/lib/newsroom/types';

export function ArticleEditor({
  article,
  busy,
  onSave,
  onDirty,
  onCancel,
  adminMode = false,
  onPublish,
}: {
  article: ManagedArticle | null;
  busy: boolean;
  onSave: (
    draft: SaveArticle,
    preview?: boolean,
    stayInEditor?: boolean,
  ) => Promise<ManagedArticle | undefined>;
  onPublish?: (saved: ManagedArticle) => Promise<ManagedArticle | undefined>;
  onDirty: (dirty: boolean) => void;
  onCancel: () => void;
  adminMode?: boolean;
}) {
  const session = useSession();
  const workflow = useNewsroomResource<WorkflowPolicy>(session.data, 'auth/workflow', !adminMode);
  const history = useNewsroomResource<ReviewHistory>(
    session.data,
    articleReviews.staffPath(article?.id ?? ''),
    !adminMode && Boolean(article),
    { refetchInterval: 20_000 },
  );
  const latest = history.data?.reviews[0];
  const pendingReview = !adminMode && latest?.state === 'PENDING';
  const policy = workflow.data ?? defaultWorkflow;
  const [helpersEnabled, setHelpersEnabled] = useState(true),
    [assisting, setAssisting] = useState(false),
    [assistNotice, setAssistNotice] = useState('');
  const helpersAllowed = (adminMode || policy.autofill) && helpersEnabled;
  const requireDateline = !adminMode && policy.requireDateline;
  const requireSources = !adminMode && policy.requireSources;
  const requireMedia = !adminMode && policy.requireMedia;
  const touched = useRef(false),
    defaultsApplied = useRef(Boolean(article));
  const [draft, setDraft] = useState(() => toDraft(article));
  const [saved, setSaved] = useState(() => JSON.stringify(toDraft(article)));
  const [error, setError] = useState('');
  const [version, setVersion] = useState(article?.version ?? null);
  const [articleStatus, setArticleStatus] = useState(article?.status);
  const [proposal, setProposal] = useState<SaveArticle | null>(null);
  const [reviewEvidence, setReviewEvidence] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const allowLeave = useRef(false);
  const dirty = JSON.stringify(draft) !== saved;
  const unsaved = dirty || reviewEvidence;
  const proposedUpdate = !adminMode && articleStatus === 'PUBLISHED';
  const approvedOnCurrentVersion =
    latest?.state === 'APPROVED' && latest.articleVersion === version;
  const canReview =
    !adminMode &&
    Boolean(article && history.data && !history.error) &&
    !pendingReview &&
    !approvedOnCurrentVersion;
  useEffect(() => {
    if (defaultsApplied.current || !workflow.data) return;
    defaultsApplied.current = true;
    if (touched.current || article) return;
    const next = {
      ...toDraft(),
      category: workflow.data.defaultCategory || 'Uttar Pradesh',
      city: workflow.data.defaultCity,
    };
    const known = cities.find((item) =>
      item.aliases.some((alias) => alias.toLowerCase() === next.city.trim().toLowerCase()),
    );
    next.region = known?.region ?? '';
    setDraft(next);
    setSaved(JSON.stringify(next));
  }, [workflow.data, article]);
  useEffect(() => {
    onDirty(unsaved);
  }, [unsaved, onDirty]);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!allowLeave.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);
  const set = (key: keyof Draft, value: string) => {
    touched.current = true;
    setDraft((current) => ({ ...current, [key]: value }));
  };
  function headline(value: string) {
    touched.current = true;
    setDraft((current) => ({
      ...current,
      title: value,
      slug:
        helpersAllowed && (current.slug === slugify(current.title) || !current.slug)
          ? slugify(value)
          : current.slug,
    }));
  }
  function validated() {
    if (requireDateline && !draft.city.trim())
      throw new Error('Add a location or dateline before saving.');
    if (requireSources && !draft.sourceNotes.trim())
      throw new Error('Add your reporting sources before saving.');
    if (
      requireMedia &&
      !draft.videoUrl &&
      !draft.youtubeId &&
      (!draft.image || draft.image.startsWith('/brand/'))
    )
      throw new Error('Choose a photograph or video for this report.');
    if (!adminMode && draft.image && !draft.image.startsWith('/brand/') && !draft.imageAlt.trim())
      throw new Error('Add a description for the photograph.');
    if (!draft.slug.trim() || !/^[\p{L}\p{N}\p{M}_-]+$/u.test(draft.slug))
      throw new Error('Use letters, numbers and hyphens for the article slug.');
    if (!allowedMedia(draft.image) || !allowedMedia(draft.videoUrl, false))
      throw new Error('Choose a local asset or an approved HTTPS media URL.');
    return {
      ...draft,
      version,
      byline: adminMode ? draft.byline : '',
      youtubeId: videoId(draft.youtubeId.trim()),
    };
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const intent = submitter instanceof HTMLButtonElement ? submitter.value : '';
      const input = validated();
      if (intent === 'review' || proposedUpdate) {
        if (canReview && !conflict && (!proposedUpdate || dirty)) setProposal(input);
        return;
      }
      if (pendingReview || approvedOnCurrentVersion) return;
      const result = await onSave(input, intent === 'preview', intent === 'publish');
      if (result) {
        const next = toDraft(result);
        setDraft(next);
        setSaved(JSON.stringify(next));
        setVersion(result.version);
        setArticleStatus(result.status);
        setConflict(false);
        if (intent === 'publish' && onPublish) {
          const published = await onPublish(result);
          if (published) {
            const finalDraft = toDraft(published);
            setDraft(finalDraft);
            setSaved(JSON.stringify(finalDraft));
            setVersion(published.version);
            setArticleStatus(published.status);
          }
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Check the article fields.');
      setConflict(
        reason instanceof CmsError && reason.problemType === 'urn:up24:article-version-conflict',
      );
    }
  }
  function openReturned(input: SaveArticle) {
    const { version: _version, ...returnedDraft } = input;
    setDraft((current) => ({ ...returnedDraft, byline: current.byline }));
  }
  function markSubmitted(review: Review) {
    history.setData({ reviews: [review, ...(history.data?.reviews ?? [])], latestInput: null });
    setSaved(JSON.stringify(draft));
    setProposal(null);
    setConflict(false);
    void history.refetch();
  }
  function reviewConflict(reason: unknown) {
    if (!(reason instanceof CmsError) || reason.status !== 409) return;
    void history.refetch();
    if (reason.problemType === 'urn:up24:article-version-conflict') {
      setConflict(true);
      setProposal(null);
    }
  }
  async function fetchVideoDetails() {
    setAssisting(true);
    setError('');
    setAssistNotice('');
    try {
      const id = videoId(draft.youtubeId.trim());
      if (!id) throw new Error('Enter a YouTube video link or ID first.');
      const details = await cms<{
        title: string;
        author: string;
        thumbnail: string;
        youtubeId: string;
        url: string;
      }>('admin/assist/video', 'POST', { videoId: id });
      touched.current = true;
      setDraft((current) => {
        const title = current.title || details.title.slice(0, 500);
        const source = `Video source: ${details.url}${details.author ? ' · ' + details.author : ''}`;
        return {
          ...current,
          title,
          slug: current.slug || slugify(title),
          youtubeId: details.youtubeId,
          image: current.image || details.thumbnail,
          imageAlt:
            current.imageAlt ||
            (!current.image ? `Video thumbnail: ${details.title}`.slice(0, 500) : ''),
          sourceNotes: current.sourceNotes.includes(details.url)
            ? current.sourceNotes
            : [current.sourceNotes, source].filter(Boolean).join('\n').slice(0, 10000),
        };
      });
      setAssistNotice(
        'Video metadata added. Your existing headline and photograph were preserved. Review the source and write the report before publication.',
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Video details could not be fetched.');
    } finally {
      setAssisting(false);
    }
  }
  const wordCount = draft.body.trim().split(/\s+/u).filter(Boolean).length;
  return (
    <section className="article-editor">
      <div className="cms-section-heading">
        <div>
          <p className="eyebrow">{article ? 'ARTICLE WORKSPACE' : 'NEW REPORT'}</p>
          <h2>
            {proposedUpdate ? 'Propose an update' : article ? 'Edit article' : 'Create a draft'}
          </h2>
        </div>
        <span className={`save-state ${dirty ? 'is-dirty' : ''}`} role="status">
          {pendingReview
            ? 'Submitted'
            : busy
              ? 'Saving…'
              : unsaved
                ? 'Unsaved changes'
                : article
                  ? 'Saved'
                  : 'New draft'}
        </span>
      </div>
      {!adminMode && workflow.error && (
        <p className="inline-error" role="alert">
          Your workflow settings could not be loaded. The full reporting checklist applies until
          they are available.
        </p>
      )}
      {!adminMode && article && (
        <>
          {history.error && (
            <div className="cms-feedback is-error" role="alert">
              <p>Review status is unavailable.</p>
              <Button type="button" variant="outline" onClick={() => void history.refetch()}>
                Retry
              </Button>
            </div>
          )}
          <StaffReviewStatus
            reviews={history.data?.reviews ?? []}
            latestInput={history.data?.latestInput}
            version={version}
            canResume={!unsaved && !busy && !proposal && !conflict}
            onResume={openReturned}
          />
          <StaffReviewSubmission
            articleId={article.id}
            input={pendingReview ? null : proposal}
            published={proposedUpdate}
            onBack={() => setProposal(null)}
            onSubmitted={markSubmitted}
            onConflict={reviewConflict}
            onEvidenceChange={setReviewEvidence}
          />
        </>
      )}
      {(pendingReview || approvedOnCurrentVersion) && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Back to article desk
        </Button>
      )}
      <form
        className={`cms-form editor-form ${styles.editorForm}`}
        hidden={Boolean(proposal) || pendingReview || approvedOnCurrentVersion}
        onSubmit={submit}
        aria-busy={busy || assisting}
      >
        <fieldset className="editor-fields" disabled={busy || assisting}>
          {(adminMode || policy.autofill) && (
            <div className={styles.assist}>
              <label className={styles.autofill}>
                <input
                  type="checkbox"
                  checked={helpersEnabled}
                  onChange={(event) => setHelpersEnabled(event.target.checked)}
                />
                Use draft helpers
              </label>
              <p className={styles.hint}>
                Suggest the article address and reuse source metadata without overwriting your
                writing.
              </p>
            </div>
          )}
          <label>
            Headline
            <input
              name="title"
              required
              maxLength={500}
              value={draft.title}
              onChange={(event) => headline(event.target.value)}
              placeholder="खबर की स्पष्ट और सटीक हेडलाइन"
            />
          </label>
          <label>
            Article address
            <input
              name="slug"
              required
              maxLength={500}
              value={draft.slug}
              onChange={(event) => set('slug', event.target.value)}
            />
            <span className="field-help">/news/{draft.slug || 'article-slug'}</span>
            {helpersAllowed && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => set('slug', slugify(draft.title))}
              >
                Use headline for address
              </Button>
            )}
          </label>
          {adminMode && (
            <label>
              Public byline
              <input
                name="byline"
                maxLength={100}
                value={draft.byline}
                onChange={(event) => set('byline', event.target.value)}
                placeholder="UP24Network Editorial Team"
              />
              <span className="field-help">
                Set the name readers see on this report. Leave blank to keep the current byline, or
                use the publication default for a new report.
              </span>
            </label>
          )}
          <div className="cms-form-row">
            <label>
              Section
              <select
                name="category"
                value={draft.category}
                onChange={(event) => set('category', event.target.value)}
              >
                {sections.map((section) => (
                  <option key={section}>{section}</option>
                ))}
              </select>
            </label>
            <label>
              City
              <input
                name="city"
                list="newsroom-cities"
                required={requireDateline}
                value={draft.city}
                maxLength={100}
                onChange={(event) => {
                  touched.current = true;
                  const city = event.target.value;
                  const known = cities.find((item) =>
                    item.aliases.some((alias) => alias.toLowerCase() === city.trim().toLowerCase()),
                  );
                  setDraft((current) => ({
                    ...current,
                    city,
                    region: known?.region ?? current.region,
                  }));
                }}
              />
              <datalist id="newsroom-cities">
                {cities.map((city) => (
                  <option key={city.slug} value={city.title} />
                ))}
              </datalist>
            </label>
          </div>
          <label>
            Regional edition
            <select
              name="region"
              value={draft.region}
              onChange={(event) => set('region', event.target.value)}
            >
              <option value="">National / international / unassigned</option>
              {regions.map((region) => (
                <option key={region.slug} value={region.slug}>
                  {region.title}
                </option>
              ))}
            </select>
            <span className="cms-field-hint">
              Select an edition even when reporting from a town outside the city directory.
            </span>
          </label>
          <label>
            Summary
            <textarea
              name="summary"
              required
              maxLength={2000}
              rows={3}
              value={draft.summary}
              onChange={(event) => set('summary', event.target.value)}
            />
            {helpersAllowed && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!draft.body.trim()}
                onClick={() =>
                  set(
                    'summary',
                    draft.body
                      .trim()
                      .split(/\n\s*\n/)[0]
                      .replace(/\s+/g, ' ')
                      .slice(0, 350),
                  )
                }
              >
                Use opening paragraph as summary
              </Button>
            )}
          </label>
          <details className="reporting-notes" open={adminMode ? undefined : true}>
            <summary>
              Reporting sources & verification{requireSources ? ' · Required' : ' · Optional'}
            </summary>
            <label>
              Private source notes
              <textarea
                name="sourceNotes"
                rows={4}
                maxLength={10000}
                required={requireSources}
                value={draft.sourceNotes}
                onChange={(event) => set('sourceNotes', event.target.value)}
                placeholder="Record the source, how the facts were checked, and any response received."
              />
              <span className="field-help">
                For the editorial team. These notes are never shown in the public article.
              </span>
            </label>
          </details>
          <label>
            Report
            <textarea
              name="body"
              className="body-editor"
              required
              rows={12}
              maxLength={100000}
              value={draft.body}
              onChange={(event) => set('body', event.target.value)}
              placeholder="Write the report. Leave a blank line between paragraphs."
            />
            <span className="field-help">
              {wordCount} words · Separate paragraphs with a blank line.
            </span>
          </label>
          <fieldset className="media-fields">
            <legend>Photograph & video</legend>
            <MediaUpload
              disabled={busy || assisting}
              onUploaded={(asset) => set('image', asset.url)}
            />
            <label>
              Photograph
              <input
                name="image"
                maxLength={2000}
                value={draft.image}
                onChange={(event) => set('image', event.target.value)}
                placeholder="/images/report.jpg or an approved HTTPS URL"
              />
            </label>
            <label>
              Image description
              <input
                name="imageAlt"
                maxLength={500}
                value={draft.imageAlt}
                onChange={(event) => set('imageAlt', event.target.value)}
                placeholder="Describe what the photograph shows"
              />
            </label>
            <label>
              YouTube video
              <input
                name="youtubeId"
                maxLength={2000}
                value={draft.youtubeId}
                onChange={(event) => set('youtubeId', event.target.value)}
                placeholder="Video link or 11-character ID"
              />
            </label>
            {helpersAllowed && (
              <div className={styles.assist}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!draft.youtubeId.trim() || assisting}
                  onClick={() => void fetchVideoDetails()}
                >
                  {assisting ? 'Fetching video details…' : 'Fetch video details'}
                </Button>
              </div>
            )}
            <label>
              Direct video source
              <input
                name="videoUrl"
                maxLength={2000}
                value={draft.videoUrl}
                onChange={(event) => set('videoUrl', event.target.value)}
                placeholder="/videos/report.mp4 or an approved HTTPS URL"
              />
            </label>
            <VideoUpload
              disabled={busy}
              onReady={(video) => {
                set('videoUrl', video.url);
                set('youtubeId', '');
              }}
            />
            <p className="field-help">
              A completed upload selects its playback copy for this report and replaces the YouTube
              source.
            </p>
            <p className="field-help">
              A YouTube video takes priority, then a direct video, then the photograph. Channel
              imports are managed in Automations.
            </p>
          </fieldset>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {assistNotice && (
            <p className="field-help" role="status">
              {assistNotice}
            </p>
          )}
          <div className="editor-actions">
            {!proposedUpdate && (
              <>
                <Button disabled={busy} type="submit" variant={adminMode ? 'default' : 'outline'}>
                  {busy ? 'Saving…' : adminMode ? 'Save article' : 'Save draft'}
                </Button>
                <Button type="submit" name="intent" value="preview" disabled={busy}>
                  Save &amp; preview
                </Button>
              </>
            )}
            {!adminMode && article && (
              <Button
                type="submit"
                name="intent"
                value="review"
                disabled={busy || !canReview || conflict || (proposedUpdate && !dirty)}
              >
                {proposedUpdate ? 'Review proposed update' : 'Prepare review request'}
              </Button>
            )}
            {adminMode && onPublish && (
              <Button type="submit" name="intent" value="publish" disabled={busy}>
                Save &amp; publish
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => (unsaved ? setConfirmClose(true) : onCancel())}
            >
              Close editor
            </Button>
          </div>
          {adminMode && article?.status === 'PUBLISHED' && (
            <p className="field-help">
              Saving updates the published report. Publication controls are on the article desk.
            </p>
          )}
          {proposedUpdate && (
            <p className="field-help">
              Changes go into a review request. Readers see the current report until the
              administrator approves the update.
            </p>
          )}
          {!adminMode && !article && (
            <p className="field-help">Save the draft to begin an editorial review request.</p>
          )}
        </fieldset>
      </form>
      {(conflict || approvedOnCurrentVersion) && article && (
        <ArticleConflict
          id={article.id}
          onReplace={(latest) => {
            const next = toDraft(latest);
            setDraft(next);
            setSaved(JSON.stringify(next));
            setVersion(latest.version);
            setArticleStatus(latest.status);
            setConflict(false);
            setError('');
          }}
        />
      )}
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Leave without saving?"
        description="Your unsaved changes will be lost. Save the report or keep editing to preserve them."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          allowLeave.current = true;
          onDirty(false);
          onCancel();
        }}
      />
    </section>
  );
}
