'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cms } from '@/lib/cms';
import { useNewsroomResource, useSession } from '@/lib/session';
import styles from './media-storage.module.css';

type MigrationStatus = {
  configured: boolean;
  state: string;
  jobId: string | null;
  moved: number;
  remaining: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
};
const activeStates = new Set(['PENDING', 'DISPATCHED', 'RUNNING']);
const labels: Record<string, string> = {
  IDLE: 'Not started',
  PENDING: 'Queued',
  DISPATCHED: 'Dispatched',
  RUNNING: 'Copying',
  SUCCEEDED: 'Batch completed',
  COMPLETED: 'Completed',
  FAILED: 'Needs attention',
  INTERRUPTED: 'Ready to resume',
};

export function MediaMigrationPanel() {
  const session = useSession(),
    client = useQueryClient();
  const result = useNewsroomResource<MigrationStatus>(
    session.data,
    'admin/media/storage/migration',
    session.data?.role === 'ADMIN',
    { refetchInterval: 15000 },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const active = result.data ? activeStates.has(result.data.state) : false;
  async function start() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const status = await cms<MigrationStatus>('admin/media/storage/migration', 'POST', {});
      result.setData(status);
      setMessage(
        'Migration queued. You can leave this page; the saved job continues in the background.',
      );
      await client.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'newsroom' &&
          query.queryKey[1] === session.data?.id &&
          String(query.queryKey[2]).startsWith('admin/media'),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Migration could not be started.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.migration} aria-labelledby="image-migration-heading">
      <div>
        <h3 id="image-migration-heading">Move existing photographs to S3</h3>
        <p>
          Copy local images in verified batches while keeping every public image address unchanged.
          Existing articles continue to use the same image identifiers.
        </p>
      </div>
      {result.isLoading && <p role="status">Loading image migration status…</p>}
      {result.data && (
        <>
          <dl className={styles.summary}>
            <div>
              <dt>Migration</dt>
              <dd>{labels[result.data.state] ?? result.data.state}</dd>
            </div>
            <div>
              <dt>Moved in this run</dt>
              <dd>{result.data.moved.toLocaleString('en-IN')}</dd>
            </div>
            <div>
              <dt>Still local</dt>
              <dd>{result.data.remaining.toLocaleString('en-IN')}</dd>
            </div>
          </dl>
          {result.data.startedAt && (
            <progress
              aria-label="Image migration progress"
              value={result.data.moved}
              max={Math.max(1, result.data.moved + result.data.remaining)}
              style={{ width: '100%', accentColor: 'var(--brand-navy)' }}
            />
          )}
          <p className="field-help">
            S3 credentials and CloudFront must be configured first. Migration temporarily needs room
            for both copies. Only after a successful switch are old local copies queued for removal
            with a ten-minute grace period. Images excluded from GIR keep their exclusion.
          </p>
          <div className={styles.actions}>
            <Button
              type="button"
              disabled={busy || active || !result.data.configured || result.data.remaining === 0}
              onClick={start}
            >
              {busy
                ? 'Please wait…'
                : active
                  ? 'Migration in progress'
                  : ['FAILED', 'INTERRUPTED'].includes(result.data.state)
                    ? 'Resume remaining images'
                    : 'Copy local images to S3'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={result.isFetching}
              onClick={() => void result.refetch()}
            >
              Refresh migration status
            </Button>
          </div>
          {result.data.completedAt && (
            <p className="field-help">
              Last run completed: {new Date(result.data.completedAt).toLocaleString('en-IN')}
            </p>
          )}
          {result.data.error && (
            <p className="inline-error" role="alert">
              {result.data.error}
            </p>
          )}
        </>
      )}
      {(error || result.error) && (
        <p className="inline-error" role="alert">
          {error || result.error?.message}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
