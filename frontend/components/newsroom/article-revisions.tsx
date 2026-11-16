'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useNewsroomResource } from '@/lib/session';
import type { Account } from '@/lib/cms';
import type { ManagedArticle } from '@/lib/newsroom/types';
import { articleDesk, type ArticleRevision } from '@/lib/newsroom/articles';
import styles from './article-admin.module.css';

function savedAt(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function ArticleRevisions({
  user,
  article,
  disabled,
  onRestored,
}: {
  user: Account;
  article: ManagedArticle;
  disabled: boolean;
  onRestored: (article: ManagedArticle) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const client = useQueryClient();
  const revisions = useNewsroomResource<ArticleRevision[]>(
    user,
    `admin/articles/${article.id}/revisions`,
    open,
  );
  const snapshot = useNewsroomResource<ManagedArticle>(
    user,
    `admin/articles/${article.id}/revisions/${selected}`,
    open && selected !== null,
  );
  const restore = useMutation({
    mutationFn: () => articleDesk.restoreRevision(article, selected!),
    onSuccess: async (result) => {
      await onRestored(result);
      setSelected(null);
      await client.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'newsroom' &&
          query.queryKey[1] === user.id &&
          String(query.queryKey[2]).startsWith('admin/articles'),
      });
    },
  });
  return (
    <details className={styles.history} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Revision history &amp; recovery</summary>
      <div className={styles.historyContent}>
        <p className="field-help">
          The latest 20 previous versions are retained. Restoring creates a new draft and preserves
          the current version in history.
        </p>
        {disabled && (
          <p className="field-help">Save your current changes before restoring a revision.</p>
        )}
        {revisions.isLoading && <p role="status">Loading saved versions…</p>}
        {revisions.error && (
          <p className="inline-error" role="alert">
            {revisions.error.message}
          </p>
        )}
        {!revisions.isLoading && revisions.data?.length === 0 && (
          <p>No earlier versions yet. They appear after the next saved change.</p>
        )}
        {Boolean(revisions.data?.length) && (
          <label className={styles.revisionPicker}>
            Saved version
            <select
              value={selected ?? ''}
              onChange={(event) => {
                setSelected(event.target.value === '' ? null : Number(event.target.value));
                restore.reset();
              }}
            >
              <option value="">Choose a version to compare</option>
              {revisions.data?.map((revision) => (
                <option key={revision.version} value={revision.version}>
                  Version {revision.version} · {savedAt(revision.savedAt)} · {revision.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {snapshot.isLoading && <p role="status">Opening revision…</p>}
        {snapshot.error && (
          <p className="inline-error" role="alert">
            {snapshot.error.message}
          </p>
        )}
        {selected !== null && snapshot.data && (
          <>
            <div className={styles.comparison}>
              {[
                { label: `Saved version ${selected}`, row: snapshot.data },
                { label: `Current version ${article.version}`, row: article },
              ].map(({ label, row }) => (
                <article key={label} className={styles.compareColumn}>
                  <h3>{label}</h3>
                  <p className={styles.compareByline}>{row.article.author}</p>
                  <h4 data-changed={snapshot.data?.article.title !== article.article.title}>
                    {row.article.title}
                  </h4>
                  <p data-changed={snapshot.data?.article.summary !== article.article.summary}>
                    {row.article.summary}
                  </p>
                  <div className={styles.compareBody}>
                    {row.article.paragraphs.map((paragraph, index) => (
                      <p
                        key={index}
                        data-changed={
                          snapshot.data?.article.paragraphs[index] !==
                          article.article.paragraphs[index]
                        }
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <Button
              variant="outline"
              disabled={disabled || restore.isPending}
              onClick={() => setConfirm(true)}
            >
              Restore this version as a draft
            </Button>
          </>
        )}
        {restore.error && (
          <p className="inline-error" role="alert">
            {restore.error.message}
          </p>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Restore this saved version?"
        description="The selected headline, byline, report and media will replace the current content. The restored report will be a draft until you publish it again."
        confirmLabel="Restore as draft"
        destructive={article.status === 'PUBLISHED'}
        onConfirm={() => restore.mutateAsync()}
      />
    </details>
  );
}
