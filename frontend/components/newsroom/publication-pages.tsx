'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminWorkspace } from '@/components/newsroom/admin-workspace';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useSession, useNewsroomResource } from '@/lib/session';
import { cms } from '@/lib/cms';
import type { EditablePublicationDocument } from '@/lib/publication-api';
import type { PublicationSection } from '@/lib/publication';
import styles from './publication-admin.module.css';

type SectionDraft = Omit<PublicationSection, 'paragraphs' | 'points'> & { body: string; bullets: string };
type PageDraft = Omit<EditablePublicationDocument, 'sections'> & { sections: SectionDraft[] };
function toDraft(page: EditablePublicationDocument): PageDraft {
  return { ...page, sections: page.sections.map(section => ({ ...section,
    body: section.paragraphs.join('\n\n'), bullets: section.points?.join('\n') ?? '', links: section.links ?? [],
  })) };
}

function PageEditor({ initial, onSaved, onDirty, onReload }: {
  initial: EditablePublicationDocument; onSaved: (page: EditablePublicationDocument) => void;
  onDirty: (dirty: boolean) => void; onReload: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  function update(next: (value: PageDraft) => PageDraft) {
    setDraft(next); setDirty(true); onDirty(true); setMessage('');
  }
  function field<K extends keyof PageDraft>(key: K, value: PageDraft[K]) { update(previous => ({ ...previous, [key]: value })); }
  function section(index: number, next: (value: SectionDraft) => SectionDraft) {
    update(previous => ({ ...previous, sections: previous.sections.map((value, position) => position === index ? next(value) : value) }));
  }
  function move(index: number, offset: number) {
    const sections = [...draft.sections];
    [sections[index], sections[index + offset]] = [sections[index + offset], sections[index]];
    field('sections', sections);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const input = { label: draft.label, title: draft.title, description: draft.description, intro: draft.intro,
        version: draft.version, sections: draft.sections.map(({ body, bullets, ...value }) => ({ ...value,
          paragraphs: body.split(/\n\s*\n/).map(text => text.trim()).filter(Boolean),
          points: bullets.split('\n').map(text => text.trim()).filter(Boolean),
        })) };
      const saved = await cms<EditablePublicationDocument>(`admin/publication/pages/${draft.path.slice(1)}`, 'PUT', input);
      setDraft(toDraft(saved)); setDirty(false); onDirty(false); onSaved(saved); setMessage('Page saved. The public page now uses this copy.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The page could not be saved.'); }
    finally { setBusy(false); }
  }
  return <>
    <form className={styles.form} onSubmit={save} aria-busy={busy}>
      <div className={styles.actions}>
        <Button type="submit" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save page'}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => dirty ? setReload(true) : void onReload()}>Reload saved page</Button>
        <a className="text-link" href={draft.path} target="_blank" rel="noopener noreferrer">View public page<span className="sr-only"> (opens in a new tab)</span></a>
        <span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
      </div>
      {error && <p role="alert" className={`${styles.feedback} ${styles.error}`}>{error}</p>}
      {message && <p role="status" className={styles.feedback}>{message}</p>}
      {initial.version > draft.version && <p role="status" className={styles.feedback}>A newer version is available. Reload the saved page before replacing it.</p>}
      <fieldset className={styles.card} disabled={busy}>
        <h2>Page heading</h2>
        <div className={styles.grid}>
          <label>Navigation label<input required maxLength={100} value={draft.label} onChange={event => field('label', event.target.value)} /></label>
          <label>Page title<input required maxLength={250} value={draft.title} onChange={event => field('title', event.target.value)} /></label>
        </div>
        <label>Search description<textarea required maxLength={600} value={draft.description} onChange={event => field('description', event.target.value)} /></label>
        <label>Introduction<textarea required maxLength={1500} value={draft.intro} onChange={event => field('intro', event.target.value)} /></label>
      </fieldset>
      <div className={styles.sectionList}>
        {draft.sections.map((value, index) => <fieldset className={styles.section} key={value.id + ':' + index} disabled={busy}>
          <div className={styles.sectionHeading}>
            <h3>Section {index + 1}</h3>
            <div className={styles.actions}>
              <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move section ${index + 1} up`}>Move up</Button>
              <Button type="button" variant="outline" size="sm" disabled={index === draft.sections.length - 1} onClick={() => move(index, 1)} aria-label={`Move section ${index + 1} down`}>Move down</Button>
              <Button type="button" variant="outline" size="sm" disabled={draft.sections.length === 1} onClick={() => field('sections', draft.sections.filter((_, position) => position !== index))}>Remove section</Button>
            </div>
          </div>
          <div className={styles.grid}>
            <label>Section heading<input required maxLength={250} value={value.title} onChange={event => section(index, previous => ({ ...previous, title: event.target.value }))} /></label>
            <label>Section link name<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={80} value={value.id} onChange={event => section(index, previous => ({ ...previous, id: event.target.value }))} /><span className={styles.helper}>Use a short name such as editorial-process. Existing links use this name.</span></label>
          </div>
          <label>Paragraphs<textarea required rows={Math.min(18, Math.max(6, Math.ceil(value.body.length / 130)))} maxLength={160000} value={value.body} onChange={event => section(index, previous => ({ ...previous, body: event.target.value }))} /><span className={styles.helper}>Separate paragraphs with a blank line.</span></label>
          <label>Bullet points<textarea rows={3} maxLength={20000} value={value.bullets} onChange={event => section(index, previous => ({ ...previous, bullets: event.target.value }))} /><span className={styles.helper}>One point per line. Leave empty when the section has no list.</span></label>
          <div className={styles.links}>
            <h3>Related publication links</h3>
            {value.links?.map((link, linkIndex) => <div className={styles.link} key={linkIndex}>
              <label>Link text<input required maxLength={100} value={link.label} onChange={event => section(index, previous => ({ ...previous, links: previous.links?.map((item, position) => position === linkIndex ? { ...item, label: event.target.value } : item) }))} /></label>
              <label>Page address<input required maxLength={500} pattern="/[A-Za-z0-9/#?=&%._~-]*" value={link.href} onChange={event => section(index, previous => ({ ...previous, links: previous.links?.map((item, position) => position === linkIndex ? { ...item, href: event.target.value } : item) }))} placeholder="/contact" /></label>
              <Button type="button" variant="outline" onClick={() => section(index, previous => ({ ...previous, links: previous.links?.filter((_, position) => position !== linkIndex) }))}>Remove link</Button>
            </div>)}
            <Button type="button" variant="outline" disabled={(value.links?.length ?? 0) >= 20} onClick={() => section(index, previous => ({ ...previous, links: [...(previous.links ?? []), { href: '/', label: '' }] }))}>Add related link</Button>
          </div>
        </fieldset>)}
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="outline" disabled={busy || draft.sections.length >= 25} onClick={() => field('sections', [...draft.sections, { id: `section-${crypto.randomUUID().slice(0, 8)}`, title: '', body: '', bullets: '', links: [] }])}>Add section</Button>
        <Button type="submit" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save page'}</Button>
      </div>
    </form>
    <ConfirmDialog open={reload} onOpenChange={setReload} title="Reload the saved page?" description="Your unsaved text changes will be discarded." confirmLabel="Discard and reload" destructive onConfirm={onReload} />
  </>;
}

export function PublicationPagesPanel() {
  const session = useSession();
  const pages = useNewsroomResource<EditablePublicationDocument[]>(session.data, 'admin/publication/pages', session.data?.role === 'ADMIN');
  const [selected, setSelected] = useState('/about');
  const [pending, setPending] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(0);
  const document = pages.data?.find(page => page.path === selected) ?? pages.data?.[0];
  async function reload() { const result = await pages.refetch(); if (result.isError) throw result.error; setDirty(false); setRevision(value => value + 1); }
  return <AdminWorkspace title="Publication pages" active="pages">
    <div className={styles.workspace}>
      <p className={styles.intro}>Edit the complete text of About, Contact, Ownership and the publication policies. You can reorganize sections, update every paragraph and change the related links.</p>
      {pages.isLoading && <p role="status">Loading publication pages…</p>}
      {pages.error && <p role="alert" className={`${styles.feedback} ${styles.error}`}>{pages.error.message}</p>}
      {document && <>
        <label className={styles.picker}>Choose a page<select value={document.path} onChange={event => {
          if (dirty) setPending(event.target.value); else setSelected(event.target.value);
        }}>{pages.data?.map(page => <option key={page.path} value={page.path}>{page.label}</option>)}</select></label>
        <PageEditor key={`${document.path}:${revision}`} initial={document} onDirty={setDirty} onReload={reload} onSaved={saved => pages.setData((pages.data ?? []).map(page => page.path === saved.path ? saved : page))} />
      </>}
    </div>
    <ConfirmDialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }} title="Leave this page?" description="Your unsaved changes will be discarded." confirmLabel="Discard and switch" destructive onConfirm={() => { if (pending) setSelected(pending); setDirty(false); }} />
  </AdminWorkspace>;
}
