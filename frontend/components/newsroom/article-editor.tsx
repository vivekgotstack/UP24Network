'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArticleConflict } from '@/components/newsroom/article-conflict';
import {
  EditorialCityPicker,
  EditorialSectionPicker,
} from '@/components/newsroom/editorial-picker';
import { ContinueStoryButton } from '@/components/newsroom/continue-story-button';
import { ArticleMediaFields } from '@/components/newsroom/article-media-fields';
import {
  StaffReviewStatus,
  StaffEditorialSubmission,
} from '@/components/newsroom/staff-article-review';
import { cms, CmsError } from '@/lib/cms';
import { useSession, useNewsroomResource } from '@/lib/session';
import { openingSummary, reportTopics, reportWordCount } from '@/lib/newsroom/report-format';
import { defaultWorkflow, type WorkflowPolicy } from '@/lib/newsroom/workflows';
import { articleDesk } from '@/lib/newsroom/articles';
import { articleReviews, type ReviewHistory, type ReviewSubmission } from '@/lib/newsroom/reviews';
import { canonicalReelUrl, trendingReelsCategory } from '@/lib/instagram';
import styles from './article-admin.module.css';

import { cities, regions } from '@/lib/regions';
import {
  toDraft,
  slugify,
  videoId,
  allowedMedia,
  emptyEnglishDraft,
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
  onEditorPublished,
}: {
  article: ManagedArticle | null;
  busy: boolean;
  onSave: (
    draft: SaveArticle,
    preview?: boolean,
    stayInEditor?: boolean,
  ) => Promise<ManagedArticle | undefined>;
  onPublish?: (saved: ManagedArticle) => Promise<ManagedArticle | undefined>;
  onEditorPublished?: (published: ManagedArticle) => void;
  onDirty: (dirty: boolean) => void;
  onCancel: () => void;
  adminMode?: boolean;
}) {
  const session = useSession();
  const editorPublication = session.data?.role === 'EDITOR';
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
  const reelArticle = draft.category === trendingReelsCategory;
  const topics = reportTopics(draft.topicLines);
  const wordCount = reportWordCount(draft.body);
  const minimumWords = reelArticle ? 12 : proposedUpdate ? 25 : 120;
  const articleSlug =
    draft.slug.trim() || (adminMode && version === null ? slugify(draft.title) : '');
  const autoSummary = adminMode ? openingSummary(draft.body) : '';
  const approvedOnCurrentVersion =
    !editorPublication && latest?.state === 'APPROVED' && latest.articleVersion === version;
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
  const set = (key: Exclude<keyof Draft, 'english'>, value: string) => {
    touched.current = true;
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const setEnglish = (key: keyof Draft['english'], value: string) => {
    touched.current = true;
    setDraft((current) => ({ ...current, english: { ...current.english, [key]: value } }));
  };
  function headline(value: string) {
    touched.current = true;
    setDraft((current) => ({
      ...current,
      title: value,
      slug:
        helpersAllowed &&
        version === null &&
        (current.slug === slugify(current.title) || !current.slug)
          ? slugify(value)
          : current.slug,
    }));
  }
  function validated(forReview: boolean): SaveArticle {
    const reelUrl = reelArticle ? canonicalReelUrl(draft.reelUrl) : null;
    if (reelArticle && !reelUrl)
      throw new Error(
        'Enter a public Instagram Reel link such as https://www.instagram.com/reel/ABC123/.',
      );
    if (forReview && requireDateline && !draft.city.trim())
      throw new Error('Add a location or dateline before sending this report for review.');
    if (
      forReview &&
      requireMedia &&
      !reelUrl &&
      !draft.videoUrl &&
      !draft.youtubeId &&
      (!draft.image || draft.image.startsWith('/brand/'))
    )
      throw new Error('Choose a photograph or video for this report.');
    if (
      forReview &&
      !reelArticle &&
      draft.image &&
      !draft.image.startsWith('/brand/') &&
      !draft.imageAlt.trim()
    )
      throw new Error('Add a description for the photograph.');
    if (!articleSlug || !/^[\p{L}\p{N}\p{M}_-]+$/u.test(articleSlug))
      throw new Error('Use letters, numbers and hyphens for the article slug.');
    const summary = draft.summary.trim() || autoSummary;
    if (!summary) throw new Error('Add an article summary.');
    if (topics.length > 8 || topics.some((tag) => tag.length > 60))
      throw new Error('Use up to eight topic tags of 60 characters each.');
    if (forReview) {
      if (summary.length < 30) throw new Error('Write a summary of at least 30 characters.');
      if (wordCount < minimumWords)
        throw new Error(`Add reporting context so this submission reaches ${minimumWords} words.`);
      if (topics.length < 2) throw new Error('Add at least two distinct topic tags.');
      if (requireSources && draft.sourceNotes.trim().length < 25)
        throw new Error('Write at least 25 characters of source and verification notes.');
      if (
        (reelUrl ||
          draft.youtubeId.trim() ||
          draft.videoUrl.trim() ||
          (draft.image && !draft.image.startsWith('/brand/'))) &&
        draft.mediaCredit.trim().length < 2
      ) {
        throw new Error('Credit the creator or source of the report media.');
      }
    }
    if (!reelArticle && (!allowedMedia(draft.image) || !allowedMedia(draft.videoUrl, false)))
      throw new Error('Choose a local asset or an approved HTTPS media URL.');
    const { title, summary: englishSummary, body } = draft.english;
    if (
      Object.values(draft.english).some((field) => field.trim()) &&
      (!title.trim() || !englishSummary.trim() || !body.trim())
    ) {
      throw new Error('Complete the English headline, summary, and report together.');
    }
    const { topicLines: _topicLines, ...fields } = draft;
    return {
      ...fields,
      version,
      slug: articleSlug,
      summary,
      tags: topics,
      mediaCredit: draft.mediaCredit.trim(),
      byline: adminMode ? draft.byline : '',
      reelUrl,
      image: reelArticle ? '' : draft.image,
      imageAlt: reelArticle ? '' : draft.imageAlt,
      youtubeId: reelArticle ? '' : videoId(draft.youtubeId.trim()),
      videoUrl: reelArticle ? '' : draft.videoUrl,
    };
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const intent = submitter instanceof HTMLButtonElement ? submitter.value : '';
      const forReview = intent === 'review' || proposedUpdate;
      const input = validated(forReview);
      if (forReview) {
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
    const { version: _version, tags, mediaCredit, ...returnedDraft } = input;
    setDraft((current) => ({
      ...returnedDraft,
      topicLines: tags ? tags.join('\n') : current.topicLines,
      mediaCredit: mediaCredit ?? current.mediaCredit,
      reelUrl: returnedDraft.reelUrl ?? '',
      english: returnedDraft.english
        ? {
            title: returnedDraft.english.title ?? '',
            summary: returnedDraft.english.summary ?? '',
            body: returnedDraft.english.body ?? '',
            imageAlt: returnedDraft.english.imageAlt ?? '',
          }
        : current.english,
      byline: current.byline,
    }));
  }
  async function commitStaffArticle(request: ReviewSubmission) {
    if (!article) return;
    if (editorPublication) {
      const published = await articleDesk.releaseByEditor(article.id, request);
      const next = toDraft(published);
      setDraft(next);
      setSaved(JSON.stringify(next));
      setVersion(published.version);
      setArticleStatus(published.status);
      setProposal(null);
      setConflict(false);
      onEditorPublished?.(published);
      return;
    }
    const review = await articleReviews.submit(article.id, request);
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
  return (
    <section className="article-editor">
      <div className="cms-section-heading">
        <div>
          <p className="eyebrow">{article ? 'ARTICLE WORKSPACE' : 'NEW REPORT'}</p>
          <h2>
            {proposedUpdate
              ? 'Propose an update'
              : article
                ? 'Edit article'
                : adminMode
                  ? 'Write a report'
                  : 'Create a draft'}
          </h2>
          {article && <p className="field-help">Story version {article.editionNumber ?? 1}</p>}
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
          <StaffEditorialSubmission
            input={pendingReview ? null : proposal}
            published={proposedUpdate}
            editorPublication={editorPublication}
            onBack={() => setProposal(null)}
            onCommit={commitStaffArticle}
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
            {reelArticle ? 'Editorial context' : 'Report'}
            <textarea
              name="body"
              className="body-editor"
              required
              rows={adminMode ? 9 : 12}
              maxLength={100000}
              value={draft.body}
              onChange={(event) => set('body', event.target.value)}
              placeholder={
                reelArticle
                  ? 'Explain what the Reel shows and the context readers should know.'
                  : 'Open with the news. Leave a blank line between paragraphs.'
              }
            />
            <span className="field-help">
              {wordCount.toLocaleString('en-IN')} words
              {!adminMode &&
                !reelArticle &&
                !proposedUpdate &&
                ' · Aim for about 1,200 words on in-depth reports.'}
              {!reelArticle && ' · For a subheading, start its own paragraph with ## and a space.'}
            </span>
          </label>
          <ArticleMediaFields
            draft={draft}
            reelArticle={reelArticle}
            adminMode={adminMode}
            busy={busy || assisting}
            assisting={assisting}
            helpersAllowed={helpersAllowed}
            requireMediaCredit={!adminMode}
            set={set}
            onVideoDetails={() => void fetchVideoDetails()}
          />
          <details
            className={styles.articleDetails}
            open={adminMode ? undefined : true}
            onInvalidCapture={(event) => {
              event.currentTarget.open = true;
            }}
          >
            <summary>
              {adminMode ? 'Article details & search' : 'Reporting details & search'}
            </summary>
            <div className={styles.articleDetailFields}>
              {!adminMode && policy.autofill && (
                <label className={styles.autofill}>
                  <input
                    type="checkbox"
                    checked={helpersEnabled}
                    onChange={(event) => setHelpersEnabled(event.target.checked)}
                  />
                  Use draft helpers
                </label>
              )}
              <label>
                Article address
                <input
                  name="slug"
                  required={!adminMode || version !== null}
                  readOnly={editorPublication && proposedUpdate}
                  maxLength={500}
                  value={draft.slug}
                  onChange={(event) => set('slug', event.target.value)}
                />
                <span className="field-help">/news/{articleSlug || 'article-slug'}</span>
                {helpersAllowed && version === null && (
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
                    Set the name readers see on this report. Leave blank to keep the current byline,
                    or use the publication default for a new report.
                  </span>
                </label>
              )}
              <div className="cms-form-row">
                <EditorialSectionPicker
                  value={draft.category}
                  choose={(value) => set('category', value)}
                />
                <EditorialCityPicker
                  value={draft.city}
                  required={false}
                  custom={adminMode}
                  choose={(city, region) => {
                    touched.current = true;
                    setDraft((current) => ({ ...current, city, region: region ?? current.region }));
                  }}
                />
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
                {reelArticle ? 'Reel introduction' : 'Summary for readers and search'}
                <textarea
                  name="summary"
                  required={!adminMode}
                  maxLength={2000}
                  rows={3}
                  value={draft.summary}
                  onChange={(event) => set('summary', event.target.value)}
                  placeholder={
                    reelArticle
                      ? 'Introduce the Reel, credit its creator, and explain why it matters.'
                      : adminMode
                        ? 'Uses the opening paragraph when left blank.'
                        : undefined
                  }
                />
                <span className="field-help">
                  {adminMode
                    ? 'Override the opening when the story needs a different summary.'
                    : 'Write a standalone summary of the main facts. At least 30 characters for review.'}
                </span>
                {helpersAllowed && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!draft.body.trim()}
                    onClick={() => set('summary', openingSummary(draft.body))}
                  >
                    Use opening paragraph as summary
                  </Button>
                )}
              </label>
              <label>
                Topic tags
                <textarea
                  name="topicLines"
                  rows={3}
                  maxLength={500}
                  value={draft.topicLines}
                  onChange={(event) => set('topicLines', event.target.value)}
                  placeholder={'लखनऊ\nमेट्रो विस्तार'}
                />
                <span className="field-help">
                  {topics.length}/8 added · One per line. Use specific people, places, or topics.
                  {!adminMode && ' At least two for review.'}
                </span>
              </label>
              <label>
                Private sources & verification
                <textarea
                  name="sourceNotes"
                  rows={4}
                  maxLength={10000}
                  value={draft.sourceNotes}
                  onChange={(event) => set('sourceNotes', event.target.value)}
                  placeholder="Record the source, how the facts were checked, and any response received."
                />
                <span className="field-help">
                  Include source references, the facts they support, and any response you sought.
                  {requireSources && ' At least 25 characters for review.'}
                </span>
              </label>
              <details className="reporting-notes" lang="en">
                <summary>English translation</summary>
                <p className="field-help">
                  Add a reviewed translation for the English edition. Include a headline, summary,
                  and full report.
                </p>
                <label>
                  English headline
                  <input
                    name="englishTitle"
                    maxLength={500}
                    value={draft.english.title}
                    onChange={(event) => setEnglish('title', event.target.value)}
                  />
                </label>
                <label>
                  English summary
                  <textarea
                    name="englishSummary"
                    rows={3}
                    maxLength={2000}
                    value={draft.english.summary}
                    onChange={(event) => setEnglish('summary', event.target.value)}
                  />
                </label>
                <label>
                  English report
                  <textarea
                    name="englishBody"
                    rows={10}
                    maxLength={100000}
                    value={draft.english.body}
                    onChange={(event) => setEnglish('body', event.target.value)}
                  />
                </label>
                <label>
                  English photograph description
                  <input
                    name="englishImageAlt"
                    maxLength={500}
                    value={draft.english.imageAlt}
                    onChange={(event) => setEnglish('imageAlt', event.target.value)}
                  />
                </label>
                {Object.values(draft.english).some(Boolean) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      touched.current = true;
                      setDraft((current) => ({ ...current, english: emptyEnglishDraft }));
                    }}
                  >
                    Clear English translation
                  </Button>
                )}
              </details>
            </div>
          </details>
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
                <Button
                  disabled={busy}
                  type="submit"
                  variant={adminMode && articleStatus === 'PUBLISHED' ? 'default' : 'outline'}
                >
                  {busy ? 'Saving…' : articleStatus === 'PUBLISHED' ? 'Save changes' : 'Save draft'}
                </Button>
                {adminMode && onPublish && articleStatus !== 'PUBLISHED' && (
                  <Button type="submit" name="intent" value="publish" disabled={busy}>
                    Save and publish
                  </Button>
                )}
                <Button
                  type="submit"
                  name="intent"
                  value="preview"
                  variant="outline"
                  disabled={busy}
                >
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
                {editorPublication
                  ? proposedUpdate
                    ? 'Prepare correction for publication'
                    : 'Prepare to publish'
                  : proposedUpdate
                    ? 'Review proposed update'
                    : 'Prepare review request'}
              </Button>
            )}
            {article?.status === 'PUBLISHED' && session.data && (
              <ContinueStoryButton
                article={article}
                user={session.data}
                disabled={busy || unsaved}
              />
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
              Saving updates the live report. Use Continue story to draft the next version
              separately.
            </p>
          )}
          {proposedUpdate && (
            <p className="field-help">
              {editorPublication
                ? 'Readers see the current report until you publish the corrections.'
                : 'Readers see the current report until the administrator approves the update.'}
            </p>
          )}
          {!adminMode && !article && (
            <p className="field-help">
              {editorPublication
                ? 'Save the draft to begin the publication checklist.'
                : 'Save the draft to begin an editorial review request.'}
            </p>
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
