"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cms, type Account, type Role } from '@/lib/cms';
import { sections } from '@/lib/sections';
import type { Article } from '@/lib/articles';

type Managed = { id: string; authorId: string | null; status: 'DRAFT' | 'PUBLISHED'; manualOverride: boolean; article: Article };
type Job = { key: string; name: string; enabled: boolean; intervalMinutes: number; lastRunAt: string | null; nextRunAt: string; lastResult: string; running: boolean };
type Draft = { title: string; slug: string; summary: string; category: string; city: string; image: string; imageAlt: string; videoUrl: string; youtubeId: string; body: string };
const emptyDraft: Draft = { title: '', slug: '', summary: '', category: 'Uttar Pradesh', city: '', image: '', imageAlt: '', videoUrl: '', youtubeId: '', body: '' };
const roles: Role[] = ['ADMIN', 'EDITOR', 'REPORTER', 'SUBSCRIBER'];

function youtubeId(value: string) {
  if (!value || /^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  try { const url = new URL(value); return url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') ?? url.pathname.split('/').pop() ?? value; }
  catch { return value; }
}
function time(value: string | null) {
  return value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value)) : 'Not run yet';
}

export function AdminConsole({ reader = false }: { reader?: boolean }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('articles');
  const [articles, setArticles] = useState<Managed[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  useEffect(() => { cms<Account>('auth/me').then(setUser).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);

  async function refresh() {
    if (!user || user.role === 'SUBSCRIBER') return;
    const requests: Promise<void>[] = [cms<Managed[]>('admin/articles').then(setArticles)];
    if (user.role === 'ADMIN') requests.push(cms<Account[]>('admin/accounts').then(setAccounts), cms<Job[]>('admin/automations').then(setJobs));
    await Promise.all(requests);
  }
  useEffect(() => {
    if (!user || reader || user.role === 'SUBSCRIBER') return;
    const requests: Promise<unknown>[] = [cms<Managed[]>('admin/articles').then(setArticles)];
    if (user.role === 'ADMIN') requests.push(cms<Account[]>('admin/accounts').then(setAccounts), cms<Job[]>('admin/automations').then(setJobs));
    Promise.all(requests).catch((reason: Error) => setError(reason.message));
  }, [user, reader]);

  async function act(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'The action could not be completed.'); }
    finally { setBusy(false); }
  }
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    await act(async () => {
      if (signup) await cms('auth/register', 'POST', { email: data.get('email'), displayName: data.get('displayName'), password: data.get('password') });
      await cms('auth/login', 'POST', new URLSearchParams({ email: String(data.get('email')), password: String(data.get('password')) }));
      setUser(await cms<Account>('auth/me'));
    });
  }
  function edit(row: Managed) {
    setEditing(row.id); setDraft({ title: row.article.title, slug: row.article.slug, summary: row.article.summary, category: row.article.category,
      city: row.article.city, image: row.article.image, imageAlt: row.article.imageAlt, videoUrl: row.article.videoUrl ?? '',
      youtubeId: row.article.youtubeId ?? '', body: row.article.paragraphs.join('\n\n') });
    setNotice('Editing this article protects your changes from automatic imports.');
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); await act(async () => {
      await cms(`admin/articles${editing ? `/${editing}` : ''}`, editing ? 'PUT' : 'POST', { ...draft, youtubeId: youtubeId(draft.youtubeId) });
      setDraft(emptyDraft); setEditing(null); setNotice('Article saved.'); await refresh();
    });
  }
  async function publication(row: Managed, published: boolean, breaking = row.article.breaking) {
    await act(async () => { await cms(`admin/articles/${row.id}/publication`, 'POST', { published, breaking }); await refresh(); setNotice(published ? 'Publication updated.' : 'Article returned to drafts.'); });
  }
  async function jobSettings(job: Job, enabled: boolean, intervalMinutes: number) {
    await act(async () => { await cms(`admin/automations/${job.key}`, 'PATCH', { enabled, intervalMinutes }); setJobs(await cms<Job[]>('admin/automations')); setNotice('Automation settings saved.'); });
  }
  const canPublish = user?.role === 'ADMIN' || user?.role === 'EDITOR';
  const field = (key: keyof Draft) => ({ value: draft[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDraft({ ...draft, [key]: event.target.value }) });

  return <main className="cms-shell" id="main-content">
    <header className="cms-heading"><div><Link href="/" className="cms-home">Back to UP24Network</Link><h1>{reader ? 'Your account' : 'Newsroom'}</h1></div>
      {user && <div className="cms-identity"><strong>{user.displayName}</strong><span>{user.role.toLowerCase()}</span>
        <Button variant="outline" disabled={busy} onClick={() => act(async () => { await cms('auth/logout', 'POST'); setUser(null); })}>Sign out</Button></div>}</header>
    {loading ? <p aria-live="polite">Opening your account…</p> : !user ?
      <section className="cms-login"><p className="eyebrow">{reader ? 'READER ACCOUNT' : 'EDITORIAL ACCESS'}</p><h2>{signup ? 'Create your reader account' : 'Sign in'}</h2>
        <form onSubmit={login} className="cms-form">
          {signup && <label>Your name<input name="displayName" autoComplete="name" required maxLength={100} /></label>}
          <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
          <label>Password<input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 12 : 1} maxLength={64} /></label>
          <Button disabled={busy} type="submit">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</Button>
        </form>
        {reader && <button className="cms-text-button" onClick={() => { setSignup(!signup); setError(''); }}>{signup ? 'Already have an account? Sign in' : 'Create a free reader account'}</button>}
      </section> : reader || user.role === 'SUBSCRIBER' ?
      <section className="cms-welcome"><h2>Welcome, {user.displayName}.</h2><p>Your {user.role.toLowerCase()} account is active.</p><Link href="/">Read the news</Link>
        {user.role !== 'SUBSCRIBER' && <Link href="/admin">Open the newsroom</Link>}</section> : <>
      <div className="cms-stats"><div><strong>{articles.filter(a => a.status === 'PUBLISHED').length}</strong><span>Published</span></div>
        <div><strong>{articles.filter(a => a.status === 'DRAFT').length}</strong><span>Drafts</span></div>
        {user.role === 'ADMIN' && <><div><strong>{accounts.length}</strong><span>Accounts</span></div><div><strong>{jobs.filter(j => j.enabled).length}</strong><span>Active automations</span></div></>}</div>
      <nav className="cms-tabs" role="tablist" aria-label="Newsroom controls">
        {(user.role === 'ADMIN' ? ['articles', 'accounts', 'automations'] : ['articles']).map(value =>
          <button key={value} role="tab" id={`tab-${value}`} aria-controls={`panel-${value}`} aria-selected={tab === value} onClick={() => setTab(value)}>{value}</button>)}
      </nav>
      <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'articles' && <div className="cms-editor-grid">
          <section><div className="cms-section-heading"><h2>{editing ? 'Edit article' : 'Create a draft'}</h2>{editing && <Button variant="ghost" onClick={() => { setEditing(null); setDraft(emptyDraft); }}>Cancel</Button>}</div>
            <form className="cms-form" onSubmit={save}>
              <label>Headline<input required maxLength={500} {...field('title')} /></label>
              <label>Article slug<input required maxLength={500} placeholder="a-clear-article-slug" {...field('slug')} /></label>
              <label>Summary<textarea required maxLength={2000} rows={3} {...field('summary')} /></label>
              <div className="cms-form-row"><label>Section<select {...field('category')}>{sections.map(section => <option key={section}>{section}</option>)}</select></label>
                <label>City<input maxLength={100} {...field('city')} /></label></div>
              <label>Article text<textarea required maxLength={100000} rows={10} {...field('body')} /></label>
              <label>Photograph URL<input placeholder="https://www.up24network.com/wp-content/uploads/..." maxLength={2000} {...field('image')} /></label>
              <label>Photograph description<input maxLength={500} {...field('imageAlt')} /></label>
              <label>YouTube video link or ID<input maxLength={2000} {...field('youtubeId')} /></label>
              <label>Direct video URL (optional)<input maxLength={2000} {...field('videoUrl')} /></label>
              <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save article'}</Button>
            </form></section>
          <section><div className="cms-section-heading"><h2>Article desk</h2><Button variant="outline" disabled={busy} onClick={() => act(refresh)}>Refresh</Button></div>
            {articles.length === 0 && <p className="cms-muted">No articles yet. Create a draft or run an approved source import.</p>}
            <div className="cms-article-list">{articles.map(row => <article key={row.id}>
              <div className="cms-badges"><span>{row.status}</span><span>{row.article.category}</span>{row.manualOverride && <span>Editorial control</span>}</div>
              <h3>{row.article.title}</h3><p>{row.article.author}</p>
              <div className="cms-row-actions"><Button size="sm" variant="outline" disabled={busy} onClick={() => edit(row)}>Edit</Button>
                {row.status === 'PUBLISHED' && <Link href={`/news/${row.article.slug}`} target="_blank">View article</Link>}
                {canPublish && <><Button size="sm" disabled={busy} onClick={() => publication(row, row.status !== 'PUBLISHED')}>{row.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</Button>
                  <label className="cms-toggle"><input type="checkbox" checked={row.article.breaking} disabled={busy || row.status !== 'PUBLISHED'} onChange={event => publication(row, true, event.target.checked)} />Breaking news</label></>}
              </div></article>)}</div>
          </section>
        </div>}
        {tab === 'accounts' && <div className="cms-editor-grid"><section><h2>Create an account</h2>
          <form className="cms-form" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); act(async () => {
            await cms('admin/accounts', 'POST', Object.fromEntries(data)); form.reset(); await refresh(); setNotice('Account created.');
          }); }}>
            <label>Name<input name="displayName" required maxLength={100} /></label><label>Email<input name="email" type="email" required maxLength={254} /></label>
            <label>Initial password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={64} /></label>
            <label>Account type<select name="role" defaultValue="REPORTER">{roles.map(role => <option key={role}>{role}</option>)}</select></label>
            <Button disabled={busy} type="submit">Create account</Button>
          </form></section><section><h2>Team and readers</h2><div className="cms-account-list">{accounts.map(account => <div key={account.id}>
            <strong>{account.displayName}</strong><span>{account.email}</span>
            <label><span className="sr-only">Role for {account.displayName}</span><select value={account.role} disabled={busy || account.id === user.id} onChange={event => act(async () => {
              await cms(`admin/accounts/${account.id}`, 'PATCH', { role: event.target.value }); await refresh(); setNotice('Account role updated.');
            })}>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
          </div>)}</div></section></div>}
        {tab === 'automations' && <><h2>Automation controls</h2><p className="cms-muted">Only your UP24Network website and YouTube channel are imported. Daily jobs need matching published content from your source. Editorial changes are protected from future imports.</p>
          <div className="cms-job-list">{jobs.map(job => <article key={job.key}><div className="cms-job-heading"><h3>{job.name}</h3>
            <label className="cms-switch"><span>{job.enabled ? 'Enabled' : 'Disabled'}</span><input type="checkbox" role="switch" aria-label={`Enable ${job.name}`} checked={job.enabled} disabled={busy} onChange={event => jobSettings(job, event.target.checked, job.intervalMinutes)} /></label></div>
            <p>{job.lastResult}</p><div className="cms-job-meta"><span>Last run: {time(job.lastRunAt)}</span><span>Next run: {job.enabled ? time(job.nextRunAt) : 'Paused'}</span></div>
            <div className="cms-row-actions"><label>Run every <select aria-label={`Interval for ${job.name}`} value={job.intervalMinutes} disabled={busy} onChange={event => jobSettings(job, job.enabled, Number(event.target.value))}>
              <option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={60}>Hour</option><option value={360}>6 hours</option><option value={1440}>Day</option><option value={10080}>Week</option>
            </select></label><Button variant="outline" disabled={busy || job.running} onClick={() => act(async () => { await cms(`admin/automations/${job.key}/run`, 'POST'); await refresh(); setNotice('Import finished.'); })}>{job.running ? 'Running…' : 'Run now'}</Button></div>
          </article>)}</div></>}
      </section>
    </>}
    {error && <p className="cms-error" role="alert">{error}</p>}{notice && <p className="cms-notice" role="status">{notice}</p>}
  </main>;
}
