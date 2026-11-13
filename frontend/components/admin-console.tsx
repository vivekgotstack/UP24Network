'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession, useNewsroomResource } from '@/lib/session';
import { cms, CmsError, type Account, type Role } from '@/lib/cms';
import { ArticleWorkspace } from '@/components/newsroom/article-workspace';
import { ArticleEditor } from '@/components/newsroom/article-editor';
import { ArticlePreview } from '@/components/newsroom/article-preview';
import { TeamPanel } from '@/components/newsroom/team-panel';
import { AutomationPanel, type AutomationJob } from '@/components/newsroom/automation-panel';
import type { ManagedArticle } from '@/lib/newsroom/types';
import { articleDesk } from '@/lib/newsroom/articles';

type Section = 'overview' | 'articles' | 'editor' | 'preview' | 'accounts' | 'automations';
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
  const editorial = Boolean(user?.newsroomAccess);
  const basePath = workspace === 'admin' ? '/admin' : '/newsroom';
  const needsArticles = editorial && ['overview', 'articles'].includes(section);
  const articleData = useNewsroomResource<ManagedArticle[]>(user, 'admin/articles', needsArticles);
  const reportData = useNewsroomResource<ManagedArticle>(
    user,
    `admin/articles/${articleId}`,
    editorial && Boolean(articleId) && ['editor', 'preview'].includes(section),
  );
  const accountData = useNewsroomResource<Account[]>(
    user,
    'admin/accounts',
    user?.role === 'ADMIN' && section === 'accounts',
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
  const articles = articleData.data ?? [],
    accounts = accountData.data ?? [],
    jobs = jobData.data ?? [];
  const loadError = articleData.error ?? reportData.error ?? accountData.error ?? jobData.error;
  useEffect(() => {
    if (!session.isLoading && session.data !== undefined && !session.data?.newsroomAccess)
      router.replace(`${basePath}/sign-in`);
  }, [session.isLoading, session.data, router, basePath]);
  useEffect(() => {
    if (loadError?.status === 401) void session.mutate();
  }, [loadError?.status, session.mutate]);
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
      if (reason instanceof CmsError && [401, 403].includes(reason.status)) void session.mutate();
      if (reason instanceof CmsError && reason.status === 409) void articleData.mutate();
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
        <Button onClick={() => session.mutate()}>Try again</Button>
      </main>
    );
  if (
    !user ||
    !editorial ||
    (['accounts', 'automations'].includes(section) && user.role !== 'ADMIN')
  )
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
    editor: articleId ? 'Edit report' : 'Create a draft',
    preview: 'Private preview',
    accounts: 'Team and readers',
    automations: 'Automation controls',
  };
  const active = ['editor', 'preview'].includes(section) ? 'articles' : section;
  const nav = [
    { key: 'overview', href: basePath, label: 'Overview', icon: LayoutDashboard },
    { key: 'articles', href: `${basePath}/articles`, label: 'Articles', icon: FileText },
    ...(user.role === 'ADMIN'
      ? [
          { key: 'accounts', href: '/admin/accounts', label: 'Accounts', icon: Users },
          { key: 'automations', href: '/admin/automations', label: 'Automations', icon: Settings2 },
        ]
      : []),
  ];
  const row = articleId ? reportData.data : null;
  const loading =
    articleData.isLoading || reportData.isLoading || accountData.isLoading || jobData.isLoading;
  const blocked = busy || Boolean(loadError);
  const published = articles.filter((item) => item.status === 'PUBLISHED').length;
  const refresh = () =>
    Promise.all([
      articleData.mutate(),
      reportData.mutate(),
      accountData.mutate(),
      jobData.mutate(),
    ]);
  async function publication(item: ManagedArticle, publish: boolean, breaking: boolean) {
    return Boolean(
      await act(
        async () => {
          await articleDesk.publish(item, publish, breaking);
          await articleData.mutate();
          return true;
        },
        publish ? 'Report published.' : 'Report returned to drafts.',
      ),
    );
  }
  return (
    <main id="main-content" className="cms-shell" lang="en">
      <header className="cms-heading">
        <div>
          <a href="/" className="cms-home">
            UP24Network / Back to reader
          </a>
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
      <nav className="cms-tabs cms-nav" aria-label="Newsroom pages">
        {nav.map((item) => (
          <a
            key={item.key}
            href={item.href}
            aria-current={active === item.key ? 'page' : undefined}
          >
            <item.icon size={16} aria-hidden="true" />
            {item.label}
          </a>
        ))}
      </nav>
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
                  <h2>Your desk, at a glance.</h2>
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
                  <strong>{articles.length - published}</strong>
                  <span>Drafts</span>
                </div>
                <div>
                  <strong>
                    {articles.filter((a) => a.article.breaking && a.status === 'PUBLISHED').length}
                  </strong>
                  <span>Breaking reports</span>
                </div>
                {user.role === 'ADMIN' && (
                  <div>
                    <strong>{jobs.filter((j) => j.enabled && j.configured).length}</strong>
                    <span>Active automations</span>
                  </div>
                )}
              </div>
              <div className="dashboard-grid">
                <section className="cms-card">
                  <p className="eyebrow">PUBLICATION WORKFLOW</p>
                  <h3>A clear path to publication.</h3>
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
                        <strong>Publish</strong>
                        <p>
                          {user.role === 'REPORTER'
                            ? 'An editor or administrator publishes completed drafts.'
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
          {section === 'articles' && (
            <ArticleWorkspace
              basePath={basePath}
              user={user}
              articles={articles}
              busy={blocked}
              refreshing={articleData.isValidating}
              onRefresh={() => act(() => articleData.mutate())}
              onPublish={publication}
            />
          )}
          {section === 'editor' &&
            (articleId && !row ? (
              <section className="empty-state">
                <h2>Report not available.</h2>
                <p>It may be outside your editorial permissions.</p>
                <Link className="text-link" href={`${basePath}/articles`}>
                  Back to article desk
                </Link>
              </section>
            ) : user.role === 'REPORTER' && row?.status === 'PUBLISHED' ? (
              <p className="inline-error">
                A reporter can edit their own drafts. Contact an editor for changes to a published
                report.
              </p>
            ) : (
              <ArticleEditor
                adminMode={user.role === 'ADMIN'}
                key={articleId ?? 'new'}
                article={row ?? null}
                busy={blocked}
                onDirty={setDirty}
                onCancel={() => window.location.assign(`${basePath}/articles`)}
                onSave={(draft, preview) =>
                  act(
                    async () => {
                      const saved = await articleDesk.save(articleId, draft);
                      await reportData.mutate(saved, { revalidate: false });
                      setDirty(false);
                      if (preview) router.push(`${basePath}/articles/${saved.id}/preview`);
                      else if (!articleId) router.replace(`${basePath}/articles/${saved.id}`);
                      return saved;
                    },
                    'Article saved.',
                    true,
                  )
                }
              />
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
              accounts={accounts}
              currentUser={user}
              busy={blocked}
              onCreate={async (account) =>
                Boolean(
                  await act(async () => {
                    await cms('admin/accounts', 'POST', account);
                    await accountData.mutate();
                    return true;
                  }, 'Account created.'),
                )
              }
              onRole={(account, role: Role) =>
                act(async () => {
                  await cms(`admin/accounts/${account.id}`, 'PATCH', { role });
                  await accountData.mutate();
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
                  await jobData.mutate();
                }, 'Automation settings saved.');
              }}
              onRun={async (job) => {
                await act(async () => {
                  await cms(`admin/automations/${job.key}/run`, 'POST');
                  await jobData.mutate();
                }, 'Source check finished. Review its result.');
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
