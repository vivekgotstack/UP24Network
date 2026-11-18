'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useSession, useNewsroomResource } from '@/lib/session';
import { cms, CmsError, type Role } from '@/lib/cms';
import { ArticleWorkspace } from '@/components/newsroom/article-workspace';
import { ArticleEditor } from '@/components/newsroom/article-editor';
import { ArticlePreview } from '@/components/newsroom/article-preview';
import { ArticleRevisions } from '@/components/newsroom/article-revisions';
import { AdminNavigation } from '@/components/newsroom/admin-workspace';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BrandLogo } from '@/components/brand-logo';
import { TeamPanel } from '@/components/newsroom/team-panel';
import { AutomationPanel, type AutomationJob } from '@/components/newsroom/automation-panel';
import type { ManagedArticle } from '@/lib/newsroom/types';
import { articleDesk, articlePagePath, type DeskPage } from '@/lib/newsroom/articles';

type Section =
  'overview' | 'articles' | 'trash' | 'editor' | 'preview' | 'accounts' | 'automations';
export function AdminConsole({
  section = 'overview',
  articleId,
  workspace = 'admin',
}: {
  section?: Section;
  articleId?: string;
  workspace?: 'admin' | 'staff';
}) {
  const session = useSession(),
    router = useRouter(),
    user = session.data;
  const client = useQueryClient();
  const [createdId, setCreatedId] = useState<string>();
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);
  const effectiveId = articleId ?? createdId;
  const editorial = Boolean(user?.newsroomAccess);
  const basePath = workspace === 'admin' ? '/admin' : '/newsroom';
  const needsArticles = editorial && section === 'overview';
  const articleData = useNewsroomResource<DeskPage>(
    user,
    articlePagePath('ALL', '', 1, 6),
    needsArticles,
  );
  const reportData = useNewsroomResource<ManagedArticle>(
    user,
    `admin/articles/${effectiveId}`,
    editorial && Boolean(effectiveId) && ['editor', 'preview'].includes(section),
  );
  const jobData = useNewsroomResource<AutomationJob[]>(
    user,
    'admin/automations',
    user?.role === 'ADMIN' && ['overview', 'automations'].includes(section),
  );
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  const articles = articleData.data?.items ?? [],
    jobs = jobData.data ?? [];
  const loadError = articleData.error ?? reportData.error ?? jobData.error;
  useEffect(() => {
    if (session.isLoading || session.data === undefined) return;
    const account = session.data;
    if (!account) {
      router.replace(`${basePath}/sign-in`);
      return;
    }
    if (!account.newsroomEligible) {
      router.replace('/account');
      return;
    }
    const destination = account.role === 'ADMIN' ? '/admin' : '/newsroom';
    if (!account.newsroomAccess) router.replace(`${destination}/sign-in`);
    else if (destination !== basePath) router.replace(destination);
  }, [session.isLoading, session.data, router, basePath]);
  useEffect(() => {
    if (loadError?.status === 401) void session.refetch();
  }, [loadError?.status, session.refetch]);
  async function act<T>(
    action: () => Promise<T>,
    success?: string,
    propagate = false,
  ): Promise<T | undefined> {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await action();
      if (success) setNotice(success);
      return result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The action could not be completed.');
      if (reason instanceof CmsError && [401, 403].includes(reason.status)) void session.refetch();
      if (reason instanceof CmsError && reason.status === 409) void articleData.refetch();
      if (propagate) throw reason;
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  if (session.isLoading || session.data === null)
    return (
      <main id="main-content" className="account-loading" role="status">
        Opening the newsroom…
      </main>
    );
  if (session.error)
    return (
      <main id="main-content" className="empty-state" role="alert">
        <h1>The newsroom could not be opened.</h1>
        <p>{session.error.message}</p>
        <Button onClick={() => session.refetch()}>Try again</Button>
      </main>
    );
  if (!user || !editorial || (workspace === 'admin' && user.role !== 'ADMIN'))
    return (
      <main id="main-content" className="empty-state">
        <h1>Editorial access required.</h1>
        <p>An administrator manages access to this workspace.</p>
        <Link className="text-link" href="/account">
          Open your account
        </Link>
      </main>
    );
  const titles = {
    overview: workspace === 'admin' ? 'Administration' : 'Reporting desk',
    articles: 'Article desk',
    trash: 'Withdrawn & trash',
    editor: articleId
      ? workspace === 'admin'
        ? 'Edit report'
        : 'Report workspace'
      : 'Create a draft',
    preview: 'Private preview',
    accounts: 'Team and readers',
    automations: 'Automation controls',
  };
  const active = ['editor', 'preview'].includes(section) ? 'articles' : section;
  const row = effectiveId ? reportData.data : null;
  const loading = articleData.isLoading || reportData.isLoading || jobData.isLoading;
  const blocked = busy || Boolean(loadError);
  const counts = articleData.data?.counts;
  const published = counts?.PUBLISHED ?? 0;
  const refresh = () =>
    Promise.all([articleData.refetch(), reportData.refetch(), jobData.refetch()]);
  const refreshArticles = () =>
    client.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'newsroom' &&
        query.queryKey[1] === user.id &&
        String(query.queryKey[2]).startsWith('admin/articles'),
    });
  return (
    <main
      id="main-content"
      className="cms-shell"
      lang="en"
      onClickCapture={(event) => {
        if (!dirty || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const anchor = event.target instanceof Element ? event.target.closest('a') : null;
        if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
        const next = new URL(anchor.href);
        if (next.origin === window.location.origin && next.href !== window.location.href) {
          event.preventDefault();
          event.stopPropagation();
          setNavigationTarget(next.pathname + next.search + next.hash);
        }
      }}
    >
      <header className="cms-heading">
        <div>
          <Link href="/" className="cms-home cms-brand-link">
            <BrandLogo /> UP24Network / Back to reader
          </Link>
          <h1>{titles[section]}</h1>
        </div>
        <div className="cms-identity">
          <div>
            <strong>{user.displayName}</strong>
            <span>{user.role.toLowerCase()}</span>
          </div>
          <Button
            variant="outline"
            disabled={busy || dirty}
            onClick={() => act(() => session.signOut())}
          >
            Sign out
          </Button>
        </div>
      </header>
      <AdminNavigation active={active} staff={workspace === 'staff'} />
      {(error || notice) && (
        <div
          className={error ? 'cms-feedback is-error' : 'cms-feedback'}
          role={error ? 'alert' : 'status'}
        >
          <p>{error || notice}</p>
          <button
            aria-label="Dismiss message"
            onClick={() => {
              setError('');
              setNotice('');
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      {loadError && (
        <div className="cms-feedback is-error" role="alert">
          <p>{loadError.message} Actions are paused until access is refreshed.</p>
          <Button variant="outline" size="sm" onClick={() => act(refresh)}>
            Retry
          </Button>
        </div>
      )}
      {loading ? (
        <div className="desk-loading" role="status">
          Loading this workspace…
        </div>
      ) : (
        <>
          {section === 'overview' && (
            <>
              <div className="cms-section-heading">
                <div>
                  <p className="eyebrow">EDITORIAL CONTROL</p>
                  <h2>Publication overview.</h2>
                </div>
                <Button variant="outline" disabled={busy} onClick={() => act(refresh)}>
                  Refresh
                </Button>
              </div>
              <div className="cms-stats">
                <div>
                  <strong>{published}</strong>
                  <span>Published reports</span>
                </div>
                <div>
                  <strong>{counts?.DRAFT ?? 0}</strong>
                  <span>Drafts</span>
                </div>
                <div>
                  <strong>{(counts?.ARCHIVED ?? 0) + (counts?.TRASH ?? 0)}</strong>
                  <span>Withdrawn / trashed reports</span>
                </div>
                {user.role === 'ADMIN' && (
                  <div>
                    <strong>{jobs.filter((j) => j.enabled && j.configured).length}</strong>
                    <span>Active automations</span>
                  </div>
                )}
              </div>
              {user.role === 'ADMIN' && (
                <div className="admin-tools-grid">
                  {[
                    [
                      '/admin/articles/new',
                      'Write & publish',
                      'Create a report, edit every paragraph and publish directly.',
                    ],
                    [
                      '/admin/articles',
                      'Manage all reports',
                      'Find any report, update its byline, review versions and control publication.',
                    ],
                    [
                      '/admin/trash',
                      'Recover or remove',
                      'Withdraw, restore and permanently delete reports.',
                    ],
                    [
                      '/admin/media',
                      'Media library',
                      'Upload optimized photographs and remove unused files.',
                    ],
                    [
                      '/admin/pages',
                      'Publication pages',
                      'Edit About, Contact, editorial standards and every policy page.',
                    ],
                    [
                      '/admin/settings',
                      'Site settings',
                      'Change the tagline, announcement and homepage sections.',
                    ],
                    [
                      '/admin/accounts',
                      'Team & readers',
                      'Manage staff roles, reader accounts and access.',
                    ],
                    [
                      '/admin/workflows',
                      'Employee workflows',
                      'Choose each employee’s requirements, defaults and helper access.',
                    ],
                    [
                      '/admin/automations',
                      'Automatic sources',
                      'Control source schedules and review fetching results.',
                    ],
                  ].map(([href, title, description]) => (
                    <Link href={href} key={href} className="admin-tool">
                      <strong>{title}</strong>
                      <p>{description}</p>
                    </Link>
                  ))}
                </div>
              )}
              <div className="dashboard-grid">
                <section className="cms-card">
                  <p className="eyebrow">PUBLICATION WORKFLOW</p>
                  <h3>From draft to publication.</h3>
                  <ol className="workflow-steps">
                    <li>
                      <span>01</span>
                      <div>
                        <strong>Create the draft</strong>
                        <p>Write the headline, summary and report. Choose its section and media.</p>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>Review the report</strong>
                        <p>Open its private preview. Check facts, media and language.</p>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>{workspace === 'staff' ? 'Submit for approval' : 'Publish'}</strong>
                        <p>
                          {workspace === 'staff'
                            ? 'Add verification and rights evidence. Your requests enter one daily review batch for the administrator.'
                            : 'Publish from the article desk. Breaking reports enter the headline strip.'}
                        </p>
                      </div>
                    </li>
                  </ol>
                  <Button asChild variant="outline">
                    <Link href={`${basePath}/articles`}>Open article desk</Link>
                  </Button>
                </section>
                <section className="cms-card">
                  <p className="eyebrow">RECENT ACTIVITY</p>
                  <h3>Recently updated reports</h3>
                  <div className="recent-reports">
                    {articles.slice(0, 5).map((item) => (
                      <article key={item.id}>
                        <span className="role-badge">{item.status.toLowerCase()}</span>
                        <p lang={/[\u0900-\u097f]/u.test(item.article.title) ? 'hi' : 'en'}>
                          <Link href={`${basePath}/articles/${item.id}/preview`}>
                            {item.article.title}
                          </Link>
                        </p>
                      </article>
                    ))}
                  </div>
                  {!articles.length && (
                    <p className="muted-note">Your article activity will appear here.</p>
                  )}
                  {user.role === 'ADMIN' && jobs.some((job) => job.failureCount > 0) && (
                    <Link className="dashboard-alert" href="/admin/automations">
                      An automation needs attention. Review its latest result.
                    </Link>
                  )}
                </section>
              </div>
            </>
          )}
          {(section === 'articles' || section === 'trash') && (
            <ArticleWorkspace basePath={basePath} user={user} trashMode={section === 'trash'} />
          )}
          {section === 'editor' &&
            (effectiveId && !row ? (
              <section className="empty-state">
                <h2>Report not available.</h2>
                <p>It may be outside your editorial permissions.</p>
                <Link className="text-link" href={`${basePath}/articles`}>
                  Back to article desk
                </Link>
              </section>
            ) : row && ['ARCHIVED', 'TRASH'].includes(row.status) ? (
              <p className="inline-error">
                Restore this report to a draft from Withdrawn &amp; trash before editing.
              </p>
            ) : (
              <>
                <ArticleEditor
                  adminMode={user.role === 'ADMIN'}
                  key={`${articleId ?? 'new'}:${editorGeneration}`}
                  article={row ?? null}
                  busy={blocked}
                  onDirty={setDirty}
                  onCancel={() => window.location.assign(`${basePath}/articles`)}
                  onSave={(draft, preview, stayInEditor) =>
                    act(
                      async () => {
                        const saved = await articleDesk.save(effectiveId, draft);
                        setCreatedId(saved.id);
                        client.setQueryData(
                          ['newsroom', user.id, `admin/articles/${saved.id}`],
                          saved,
                        );
                        await refreshArticles();
                        setDirty(false);
                        if (preview) router.push(`${basePath}/articles/${saved.id}/preview`);
                        else if (!articleId && !stayInEditor)
                          router.replace(`${basePath}/articles/${saved.id}`);
                        return saved;
                      },
                      'Article saved.',
                      true,
                    )
                  }
                  onPublish={
                    user.role === 'ADMIN'
                      ? (saved) =>
                          act(
                            async () => {
                              const published = await articleDesk.publish(
                                saved,
                                true,
                                saved.article.breaking,
                              );
                              client.setQueryData(
                                ['newsroom', user.id, `admin/articles/${published.id}`],
                                published,
                              );
                              await refreshArticles();
                              if (!articleId)
                                router.replace(`${basePath}/articles/${published.id}`);
                              return published;
                            },
                            'Report published.',
                            true,
                          )
                      : undefined
                  }
                />
                {user.role === 'ADMIN' && row && (
                  <ArticleRevisions
                    user={user}
                    article={row}
                    disabled={dirty || busy}
                    onRestored={async (restored) => {
                      client.setQueryData(
                        ['newsroom', user.id, `admin/articles/${restored.id}`],
                        restored,
                      );
                      setEditorGeneration((value) => value + 1);
                      setNotice('Saved version restored as a draft.');
                      router.refresh();
                    }}
                  />
                )}
              </>
            ))}
          {section === 'preview' &&
            (row ? (
              <ArticlePreview row={row} basePath={basePath} />
            ) : (
              <section className="empty-state">
                <h2>Preview not available.</h2>
                <Link className="text-link" href={`${basePath}/articles`}>
                  Back to article desk
                </Link>
              </section>
            ))}
          {section === 'accounts' && (
            <TeamPanel
              accounts={[]}
              currentUser={user}
              busy={blocked}
              onCreate={async (account) =>
                Boolean(
                  await act(async () => {
                    await cms('admin/accounts', 'POST', account);
                    await client.invalidateQueries({
                      predicate: (query) =>
                        query.queryKey[0] === 'newsroom' &&
                        query.queryKey[1] === user.id &&
                        String(query.queryKey[2]).startsWith('admin/accounts'),
                    });
                    return true;
                  }, 'Account created.'),
                )
              }
              onRole={(account, role: Role) =>
                act(async () => {
                  await cms(`admin/accounts/${account.id}`, 'PATCH', {
                    role,
                    version: account.version,
                  });
                  await client.invalidateQueries({
                    predicate: (query) =>
                      query.queryKey[0] === 'newsroom' &&
                      query.queryKey[1] === user.id &&
                      String(query.queryKey[2]).startsWith('admin/accounts'),
                  });
                }, 'Account role updated.')
              }
            />
          )}
          {section === 'automations' && (
            <AutomationPanel
              jobs={jobs}
              busy={blocked}
              onSettings={async (job, enabled, intervalMinutes) => {
                await act(async () => {
                  await cms(`admin/automations/${job.key}`, 'PATCH', { enabled, intervalMinutes });
                  await jobData.refetch();
                }, 'Automation settings saved.');
              }}
              onRun={async (job) => {
                await act(async () => {
                  await cms(`admin/automations/${job.key}/run`, 'POST');
                  await jobData.refetch();
                }, 'Source check finished. Review its result.');
              }}
            />
          )}
        </>
      )}
      <ConfirmDialog
        open={Boolean(navigationTarget)}
        onOpenChange={(open) => {
          if (!open) setNavigationTarget(null);
        }}
        title="Leave this unsaved report?"
        description="Your unsaved changes will be lost. Save the report or keep editing to preserve them."
        confirmLabel="Discard changes and leave"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setDirty(false);
          if (navigationTarget) router.push(navigationTarget);
        }}
      />
    </main>
  );
}
