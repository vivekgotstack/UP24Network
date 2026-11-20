'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminWorkspace } from '@/components/newsroom/admin-workspace';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useSession, useNewsroomResource } from '@/lib/session';
import { cms } from '@/lib/cms';
import type { PublicationSettings } from '@/lib/publication-api';
import styles from './publication-admin.module.css';

function SettingsForm({
  initial,
  onSaved,
  onReload,
}: {
  initial: PublicationSettings;
  onSaved: (settings: PublicationSettings) => void;
  onReload: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reload, setReload] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  function set<K extends keyof PublicationSettings>(key: K, value: PublicationSettings[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
    setFeedback('');
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      const { updatedAt: _updatedAt, ...input } = draft;
      const saved = await cms<PublicationSettings>('admin/publication/settings', 'PUT', input);
      setDraft(saved);
      setDirty(false);
      onSaved(saved);
      setFeedback('Publication settings saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Settings could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form className={styles.form} onSubmit={save} aria-busy={busy}>
        <div className={styles.actions}>
          <Button type="submit" disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save settings'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              dirty
                ? setReload(true)
                : void onReload().catch((reason) =>
                    setError(
                      reason instanceof Error ? reason.message : 'Settings could not be reloaded.',
                    ),
                  )
            }
          >
            Reload
          </Button>
          <span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        </div>
        {error && (
          <p role="alert" className={`${styles.feedback} ${styles.error}`}>
            {error}
          </p>
        )}
        {feedback && (
          <p role="status" className={styles.feedback}>
            {feedback}
          </p>
        )}
        <fieldset className={styles.card} disabled={busy}>
          <h2>Publication identity</h2>
          <label>
            Hindi masthead tagline
            <input
              required
              maxLength={160}
              value={draft.tagline}
              onChange={(event) => set('tagline', event.target.value)}
            />
          </label>
          <label>
            Footer description
            <textarea
              maxLength={600}
              value={draft.footerDescription}
              onChange={(event) => set('footerDescription', event.target.value)}
            />
          </label>
          <p>The official UP24Network logo stays the masthead mark.</p>
        </fieldset>
        <fieldset className={styles.card} disabled={busy}>
          <h2>Publication announcement</h2>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={draft.announcementEnabled}
              onChange={(event) => set('announcementEnabled', event.target.checked)}
            />
            <span>
              Display announcement<small>Show one short notice below the main navigation.</small>
            </span>
          </label>
          <label>
            Announcement text
            <textarea
              maxLength={400}
              required={draft.announcementEnabled}
              value={draft.announcement}
              onChange={(event) => set('announcement', event.target.value)}
            />
          </label>
        </fieldset>
        <fieldset className={styles.card} disabled={busy}>
          <h2>Front-page sections</h2>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={draft.showCricketScores !== false}
              onChange={(event) => set('showCricketScores', event.target.checked)}
            />
            <span>
              Live cricket scores
              <small>Show the free, automatically updated tracker after reader consent.</small>
            </span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={draft.showVideo}
              onChange={(event) => set('showVideo', event.target.checked)}
            />
            <span>
              Video coverage
              <small>Display the video section on the homepage and its main navigation link.</small>
            </span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={draft.showRashifal}
              onChange={(event) => set('showRashifal', event.target.checked)}
            />
            <span>
              Daily Rashifal
              <small>
                Display the Rashifal section on the homepage and its secondary navigation link.
              </small>
            </span>
          </label>
          <p>These display settings do not change the separately controlled import schedules.</p>
        </fieldset>
        <div className={styles.actions}>
          <Button type="submit" disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={reload}
        onOpenChange={setReload}
        title="Reload saved settings?"
        description="Your unsaved changes will be discarded."
        confirmLabel="Discard and reload"
        destructive
        onConfirm={onReload}
      />
    </>
  );
}

export function PublicationSettingsPanel() {
  const session = useSession();
  const settings = useNewsroomResource<PublicationSettings>(
    session.data,
    'admin/publication/settings',
    session.data?.role === 'ADMIN',
  );
  const [revision, setRevision] = useState(0);
  async function reload() {
    const result = await settings.refetch();
    if (result?.isError) throw result.error;
    setRevision((value) => value + 1);
  }
  return (
    <AdminWorkspace title="Publication settings" active="settings">
      <div className={styles.workspace}>
        <p className={styles.intro}>
          Control the publication identity, reader notices and front-page sections. Changes apply
          across the website after saving.
        </p>
        {settings.isLoading && <p role="status">Loading publication settings…</p>}
        {settings.error && (
          <p role="alert" className={`${styles.feedback} ${styles.error}`}>
            {settings.error.message}
          </p>
        )}
        {settings.data && (
          <SettingsForm
            key={revision}
            initial={settings.data}
            onSaved={settings.setData}
            onReload={reload}
          />
        )}
      </div>
    </AdminWorkspace>
  );
}
