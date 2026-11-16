'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cms } from '@/lib/cms';
import { useSession, useNewsroomResource } from '@/lib/session';
import styles from './media-storage.module.css';

type Policy = { enabled: boolean; transitionDays: number; version: number; appliedVersion: number | null; appliedAt: string | null; lastError: string | null };
type StorageStatus = { uploadBackend: 'LOCAL' | 'S3'; s3Configured: boolean; bucket: string; region: string; prefix: string; deliveryOrigin: string; localAssets: number; s3Assets: number; pendingDeletions: number; policy: Policy };
export function MediaStoragePanel() {
  const session = useSession();
  const result = useNewsroomResource<StorageStatus>(session.data, 'admin/media/storage', session.data?.role === 'ADMIN', { refetchInterval: 30000 });
  const [draft, setDraft] = useState<Policy | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const policy = draft ?? result.data?.policy;
  useEffect(() => {
    if (!draft) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [draft]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!policy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await cms('admin/media/storage', 'PUT', { enabled: policy.enabled, transitionDays: policy.transitionDays, version: policy.version });
      setDraft(null); await result.refetch();
      setMessage('Policy saved. Configured S3 storage synchronizes automatically; you can also apply it now.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Policy could not be saved.'); }
    finally { setBusy(false); }
  }
  async function synchronize() {
    setBusy(true); setError(''); setMessage('');
    try {
      await cms('admin/media/storage/sync', 'POST', {}); await result.refetch();
      setMessage('The retention rule has been synchronized with S3.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'AWS synchronization failed.'); await result.refetch(); }
    finally { setBusy(false); }
  }
  return <section className={`admin-card ${styles.panel}`} aria-labelledby="storage-heading">
    <div><p className="eyebrow">STORAGE & RETENTION</p><h2 id="storage-heading">Keep the archive available.</h2>
      <p>Published images keep the same address. Eligible S3 objects move from Standard to Glacier Instant Retrieval and remain immediately readable.</p></div>
    {result.isLoading && <p role="status">Loading storage settings…</p>}
    {result.data && <>
      <dl className={styles.summary}>
        <div><dt>New uploads</dt><dd>{result.data.uploadBackend === 'S3' ? 'Amazon S3 Standard' : 'Local storage'}</dd></div>
        <div><dt>Library</dt><dd>{result.data.localAssets} local · {result.data.s3Assets} S3</dd></div>
        <div><dt>Rule status</dt><dd>{!result.data.s3Configured ? 'Waiting for AWS configuration' : result.data.policy.appliedVersion === result.data.policy.version ? 'Synchronized' : 'Pending synchronization'}</dd></div>
        <div><dt>Pending removal</dt><dd>{result.data.pendingDeletions} objects</dd></div>
      </dl>
      {result.data.s3Configured ? <p className={styles.location}>{result.data.bucket} · {result.data.region}<br />{result.data.deliveryOrigin}</p> :
        <p className="field-help">Local preview works without AWS. Set the S3 bucket, region, credentials and CloudFront origin in the backend environment when your account is ready. Existing local photographs remain available.</p>}
      {policy && <form className="cms-form" onSubmit={save}>
        <fieldset className={styles.fields} disabled={busy}>
          <label className={styles.toggle}><input type="checkbox" checked={policy.enabled} onChange={(event) => setDraft({ ...policy, enabled: event.target.checked })} />Enable automatic Standard → GIR transitions</label>
          <label className={styles.age}>Transition after days<input type="number" min={90} max={3650} required value={policy.transitionDays} onChange={(event) => setDraft({ ...policy, transitionDays: Number(event.target.value) })} /></label>
          <p className="field-help">Default: 365 days. Only eligible objects of at least 128 KiB in UP24’s configured S3 prefix qualify. GIR has retrieval charges and a 90-day minimum billable storage duration. This policy never deletes articles or media.</p>
          <div className={styles.actions}><Button type="submit" disabled={!draft || busy}>{busy ? 'Please wait…' : 'Save policy'}</Button>
            <Button type="button" variant="outline" disabled={!result.data.s3Configured || !!draft || busy} onClick={synchronize}>Apply saved rule to AWS</Button>
            {draft && <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Discard changes</Button>}
          </div>
        </fieldset>
      </form>}
      {result.data.policy.appliedAt && <p className="field-help">Last applied: {new Date(result.data.policy.appliedAt).toLocaleString('en-IN')}</p>}
      {(error || result.error || result.data.policy.lastError) && <p className="inline-error" role="alert">{error || result.error?.message || result.data.policy.lastError}</p>}
      {message && <p role="status">{message}</p>}
    </>}
    {!result.data && result.error && <p className="inline-error" role="alert">{result.error.message}</p>}
  </section>;
}
