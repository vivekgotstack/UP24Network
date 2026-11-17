'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { textLanguage } from '@/lib/language';
import { useNewsroomResource } from '@/lib/session';
import type { Account } from '@/lib/cms';
import type { ManagedArticle } from '@/lib/newsroom/types';
import {
  articleDesk,
  articlePagePath,
  type DeskPage,
  type LifecycleAction,
} from '@/lib/newsroom/articles';
import styles from './article-admin.module.css';

type Command = LifecycleAction | 'PURGE' | 'PUBLISH' | 'UNPUBLISH';
type Confirmation = { command: Command; articles: ManagedArticle[] };
const labels: Record<Command, string> = {
  ARCHIVE: 'Withdraw',
  TRASH: 'Move to trash',
  RESTORE: 'Restore as draft',
  PURGE: 'Delete permanently',
  PUBLISH: 'Publish',
  UNPUBLISH: 'Unpublish',
};

export function ArticleWorkspace({
  user,
  basePath,
  trashMode = false,
}: {
  user: Account;
  basePath: '/admin' | '/newsroom';
  trashMode?: boolean;
}) {
  const client = useQueryClient();
  const [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState(trashMode ? 'TRASH' : 'ALL');
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null),
    [notice, setNotice] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query);
      setPage(1);
      setSelected([]);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  const resource = useNewsroomResource<DeskPage>(user, articlePagePath(filter, search, page));
  const rows = resource.data?.items ?? [];
  const administrator = user.role === 'ADMIN',
    canPublish = administrator || user.role === 'EDITOR';
  const refresh = () =>
    client.invalidateQueries({
      predicate: (entry) =>
        entry.queryKey[0] === 'newsroom' &&
        entry.queryKey[1] === user.id &&
        String(entry.queryKey[2]).startsWith('admin/articles'),
    });
  const action = useMutation({
    mutationFn: async ({ command, articles }: Confirmation) => {
      let completed = 0;
      try {
        for (const row of articles) {
          if (command === 'PURGE') await articleDesk.purge(row);
          else if (command === 'PUBLISH' || command === 'UNPUBLISH')
            await articleDesk.publish(row, command === 'PUBLISH', row.article.breaking);
          else await articleDesk.lifecycle(row, command);
          completed++;
        }
      } catch (reason) {
        const detail = reason instanceof Error ? reason.message : 'The operation failed.';
        throw new Error(
          completed
            ? `${completed} report${completed === 1 ? '' : 's'} changed before this operation stopped. ${detail}`
            : detail,
        );
      } finally {
        await refresh();
        setSelected([]);
      }
      return completed;
    },
    onSuccess: (count, input) =>
      setNotice(`${labels[input.command]} completed for ${count} report${count === 1 ? '' : 's'}.`),
  });
  const request = (command: Command, articles: ManagedArticle[]) => {
    action.reset();
    setNotice('');
    setConfirmation({ command, articles });
  };
  const chosen = rows.filter((row) => selected.includes(row.id));
  const busy = action.isPending;
  return (
    <section>
      <div className="cms-section-heading">
        <div>
          <p className="eyebrow">{trashMode ? 'CONTENT RECOVERY' : 'EDITORIAL WORKSPACE'}</p>
          <h2>{trashMode ? 'Withdrawn & trash' : 'All reports'}</h2>
        </div>
        <div className="cms-row-actions">
          <Button
            variant="outline"
            disabled={busy || resource.isFetching}
            onClick={() => void resource.refetch()}
          >
            {resource.isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
          {!trashMode && (
            <Button asChild>
              <Link href={`${basePath}/articles/new`}>
                <Plus size={16} aria-hidden="true" />
                New article
              </Link>
            </Button>
          )}
        </div>
      </div>
      {trashMode && (
        <p className="cms-muted">
          Withdrawn reports stay off the public site. Trashed reports can be restored or permanently
          removed. Restoration always creates a draft.
        </p>
      )}
      <div className="desk-filters">
        <label className="desk-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Find an article</span>
          <input
            type="search"
            value={query}
            maxLength={200}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a headline, section or city"
          />
        </label>
        <label>
          <span className="sr-only">Publication status</span>
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
              setSelected([]);
            }}
          >
            {trashMode ? (
              <>
                <option value="TRASH">Trash</option>
                <option value="ARCHIVED">Withdrawn</option>
              </>
            ) : (
              <>
                <option value="ALL">All active articles</option>
                <option value="DRAFT">Drafts</option>
                <option value="PUBLISHED">Published</option>
              </>
            )}
          </select>
        </label>
      </div>
      <p className={styles.count} role="status">
        {resource.data?.total ?? 0} matching reports
        {user.role === 'REPORTER' ? ' assigned to you' : ''}
        {resource.isFetching ? ' · Updating…' : ''}
      </p>
      {resource.error && (
        <div className="cms-feedback is-error" role="alert">
          <p>{resource.error.message}</p>
          <Button variant="outline" onClick={() => void resource.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {action.error && (
        <p className="inline-error" role="alert">
          {action.error.message}
        </p>
      )}
      {notice && (
        <p role="status" className="cms-feedback">
          {notice}
        </p>
      )}
      {administrator && rows.length > 0 && (
        <div className={styles.bulk}>
          <label className={styles.selection}>
            <input
              type="checkbox"
              checked={selected.length === rows.length}
              disabled={busy}
              onChange={(event) =>
                setSelected(event.target.checked ? rows.map((row) => row.id) : [])
              }
            />
            Select this page
          </label>
          <span>{chosen.length} selected</span>
          {chosen.length > 0 && (
            <>
              {!trashMode && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => request('ARCHIVE', chosen)}
                >
                  Withdraw selected
                </Button>
              )}
              {trashMode && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => request('RESTORE', chosen)}
                >
                  Restore selected
                </Button>
              )}
              {filter !== 'TRASH' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => request('TRASH', chosen)}
                >
                  Trash selected
                </Button>
              )}
              {filter === 'TRASH' && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => request('PURGE', chosen)}
                >
                  Delete selected permanently
                </Button>
              )}
            </>
          )}
        </div>
      )}
      {resource.isLoading ? (
        <div className="desk-loading" role="status">
          Loading reports…
        </div>
      ) : rows.length ? (
        <div className={styles.rows}>
          {rows.map((row) => (
            <article key={row.id} className={styles.row}>
              {administrator && (
                <label className={styles.selection}>
                  <span className="sr-only">Select {row.article.title}</span>
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    disabled={busy}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, row.id]
                          : current.filter((id) => id !== row.id),
                      )
                    }
                  />
                </label>
              )}
              <div className={styles.rowContent}>
                <div className="cms-badges">
                  <span data-status={row.status}>{row.status}</span>
                  <span>{row.article.category}</span>
                  {row.article.breaking && <span>Breaking</span>}
                </div>
                <h3 lang={textLanguage(row.article.title)}>{row.article.title}</h3>
                <p>
                  {row.article.author}
                  {row.article.city ? ` · ${row.article.city}` : ''} · Version {row.version}
                  {row.manualOverride ? ' · Editorial control' : ' · Imported'}
                </p>
                <div className="cms-row-actions">
                  {!trashMode && !(user.role === 'REPORTER' && row.status !== 'DRAFT') && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`${basePath}/articles/${row.id}`}>Edit report</Link>
                    </Button>
                  )}
                  <Link href={`${basePath}/articles/${row.id}/preview`}>Preview</Link>
                  {row.status === 'PUBLISHED' && (
                    <Link
                      href={`/news/${row.article.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View public report
                    </Link>
                  )}
                  {!trashMode && canPublish && (
                    <Button
                      size="sm"
                      disabled={busy}
                      variant={row.status === 'PUBLISHED' ? 'outline' : 'default'}
                      onClick={() =>
                        request(row.status === 'PUBLISHED' ? 'UNPUBLISH' : 'PUBLISH', [row])
                      }
                    >
                      {row.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </Button>
                  )}
                  {!trashMode && canPublish && (
                    <label className="cms-toggle">
                      <input
                        type="checkbox"
                        checked={row.article.breaking}
                        disabled={busy || row.status !== 'PUBLISHED'}
                        onChange={() =>
                          void action
                            .mutateAsync({
                              command: 'PUBLISH',
                              articles: [
                                {
                                  ...row,
                                  article: { ...row.article, breaking: !row.article.breaking },
                                },
                              ],
                            })
                            .catch(() => undefined)
                        }
                      />
                      Breaking news
                    </label>
                  )}
                  {administrator && (
                    <>
                      {!trashMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => request('ARCHIVE', [row])}
                        >
                          Withdraw
                        </Button>
                      )}
                      {trashMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => request('RESTORE', [row])}
                        >
                          Restore as draft
                        </Button>
                      )}
                      {row.status !== 'TRASH' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => request('TRASH', [row])}
                        >
                          Move to trash
                        </Button>
                      )}
                      {row.status === 'TRASH' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => request('PURGE', [row])}
                        >
                          Delete permanently
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        !resource.error && (
          <div className="desk-empty">
            <FileText size={30} aria-hidden="true" />
            <h3>No matching reports</h3>
            <p>
              {trashMode
                ? 'There are no reports in this recovery view.'
                : 'Change the search or publication filter, or create a new report.'}
            </p>
          </div>
        )
      )}
      <div className={styles.pager}>
        <Button
          variant="outline"
          disabled={busy || page <= 1}
          onClick={() => {
            setPage((current) => current - 1);
            setSelected([]);
          }}
        >
          Previous
        </Button>
        <span>
          Page {resource.data?.page ?? page} of {resource.data?.pages ?? 1}
        </span>
        <Button
          variant="outline"
          disabled={busy || page >= (resource.data?.pages ?? 1)}
          onClick={() => {
            setPage((current) => current + 1);
            setSelected([]);
          }}
        >
          Next
        </Button>
      </div>
      <ConfirmDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={`${confirmation ? labels[confirmation.command] : 'Change'} ${confirmation?.articles.length === 1 ? 'this report' : `${confirmation?.articles.length ?? 0} reports`}?`}
        description={
          confirmation?.command === 'PURGE'
            ? 'This permanently removes the selected reports and their saved revisions. Deleted source imports will not be fetched back automatically.'
            : confirmation?.command === 'RESTORE'
              ? 'The selected reports will return as drafts. They will remain private until you publish them.'
              : confirmation?.command === 'PUBLISH'
                ? 'The selected report will be visible to readers immediately. Review the headline, body and media before publishing.'
                : 'The selected reports will be removed from the public site. You can recover withdrawn and trashed reports later.'
        }
        confirmLabel={confirmation ? labels[confirmation.command] : 'Confirm'}
        destructive={Boolean(
          confirmation && ['PURGE', 'TRASH', 'UNPUBLISH'].includes(confirmation.command),
        )}
        onConfirm={async () => {
          if (!confirmation) return false;
          await action.mutateAsync(confirmation);
          return true;
        }}
      />
    </section>
  );
}
