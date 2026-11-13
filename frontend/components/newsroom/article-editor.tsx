'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArticleConflict } from '@/components/newsroom/article-conflict';
import { CmsError } from '@/lib/cms';

import { sections } from '@/lib/sections';
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
}: {
  article: ManagedArticle | null;
  busy: boolean;
  onSave: (draft: SaveArticle, preview?: boolean) => Promise<ManagedArticle | undefined>;
  onDirty: (dirty: boolean) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => toDraft(article));
  const [saved, setSaved] = useState(() => JSON.stringify(toDraft(article)));
  const [error, setError] = useState('');
  const [version, setVersion] = useState(article?.version ?? null);
  const [conflict, setConflict] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const allowLeave = useRef(false);
  const dirty = JSON.stringify(draft) !== saved;
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!allowLeave.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const set = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  function headline(value: string) {
    setDraft((current) => ({
      ...current,
      title: value,
      slug:
        current.slug === slugify(current.title) || !current.slug ? slugify(value) : current.slug,
    }));
  }
  function validated() {
    if (!draft.slug.trim() || !/^[\p{L}\p{N}\p{M}_-]+$/u.test(draft.slug))
      throw new Error('Use letters, numbers and hyphens for the article slug.');
    if (!allowedMedia(draft.image) || !allowedMedia(draft.videoUrl, false))
      throw new Error('Choose a local asset or an approved HTTPS media URL.');
    return { ...draft, version, youtubeId: videoId(draft.youtubeId.trim()) };
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const result = await onSave(
        validated(),
        submitter instanceof HTMLButtonElement && submitter.value === 'preview',
      );
      if (result) {
        const next = toDraft(result);
        setDraft(next);
        setSaved(JSON.stringify(next));
        setVersion(result.version);
        setConflict(false);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Check the article fields.');
      setConflict(
        reason instanceof CmsError && reason.problemType === 'urn:up24:article-version-conflict',
      );
    }
  }
  const wordCount = draft.body.trim().split(/\s+/u).filter(Boolean).length;
  return (
    <section className="article-editor">
      <div className="cms-section-heading">
        <div>
          <p className="eyebrow">{article ? 'ARTICLE WORKSPACE' : 'NEW REPORT'}</p>
          <h2>{article ? 'Edit article' : 'Create a draft'}</h2>
        </div>
        <span className={`save-state ${dirty ? 'is-dirty' : ''}`} role="status">
          {busy ? 'Saving…' : dirty ? 'Unsaved changes' : article ? 'Saved' : 'New draft'}
        </span>
      </div>
      <form className="cms-form editor-form" onSubmit={submit} aria-busy={busy}>
        <fieldset className="editor-fields" disabled={busy}>
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
          </label>
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
                value={draft.city}
                maxLength={100}
                onChange={(event) => set('city', event.target.value)}
              />
            </label>
          </div>
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
          </label>
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
          <div className="editor-actions">
            <Button disabled={busy} type="submit">
              {busy ? 'Saving…' : 'Save article'}
            </Button>
            <Button type="submit" name="intent" value="preview" disabled={busy}>
              Save &amp; preview
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => (dirty ? setConfirmClose(true) : onCancel())}
            >
              Close editor
            </Button>
          </div>
          {article?.status === 'PUBLISHED' && (
            <p className="field-help">
              Saving updates the published report. Publication controls are on the article desk.
            </p>
          )}
        </fieldset>
      </form>
      {conflict && article && (
        <ArticleConflict
          id={article.id}
          onReplace={(latest) => {
            const next = toDraft(latest);
            setDraft(next);
            setSaved(JSON.stringify(next));
            setVersion(latest.version);
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
