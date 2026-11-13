'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { articleDesk } from '@/lib/newsroom/articles';
import type { ManagedArticle } from '@/lib/newsroom/types';
import { textLanguage } from '@/lib/language';

export function ArticleConflict({
  id,
  onReplace,
}: {
  id: string;
  onReplace: (latest: ManagedArticle) => void;
}) {
  const [latest, setLatest] = useState<ManagedArticle | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  async function review() {
    setBusy(true);
    setError('');
    try {
      setLatest(await articleDesk.find(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the saved report.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="article-conflict" aria-label="Review conflicting changes">
      <h3>A newer version is saved.</h3>
      <p>
        Your changes are still in the editor. Review the saved report and copy any text you want to
        keep before replacing your draft.
      </p>
      <Button type="button" variant="outline" disabled={busy} onClick={review}>
        {busy
          ? 'Loading saved report…'
          : latest
            ? 'Check for newer changes'
            : 'Review saved report'}
      </Button>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {latest && (
        <>
          <details className="revision-preview" open>
            <summary>
              Saved report · {latest.status === 'PUBLISHED' ? 'Published' : 'Draft'}
            </summary>
            <div lang={textLanguage(latest.article.title)}>
              <h4>{latest.article.title}</h4>
              <p>{latest.article.summary}</p>
              {latest.article.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </details>
          <Button type="button" variant="outline" onClick={() => setConfirm(true)}>
            Use this saved version
          </Button>
          <ConfirmDialog
            open={confirm}
            onOpenChange={setConfirm}
            title="Replace your unsaved changes?"
            description="The saved report will replace the text in your editor. Copy anything you want to keep first."
            confirmLabel="Replace my draft"
            cancelLabel="Keep editing"
            destructive
            onConfirm={() => onReplace(latest)}
          />
        </>
      )}
    </section>
  );
}
