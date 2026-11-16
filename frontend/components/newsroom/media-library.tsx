'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { AdminWorkspace } from '@/components/newsroom/admin-workspace';
import { MediaUpload } from '@/components/newsroom/media-upload';
import { MediaStoragePanel } from '@/components/newsroom/media-storage-panel';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { useSession, useNewsroomResource } from '@/lib/session';
import { cms } from '@/lib/cms';
import type { MediaAsset, MediaPage } from '@/lib/newsroom/media';

export function MediaLibrary() {
  const session = useSession(),
    client = useQueryClient();
  const [page, setPage] = useState(1),
    [error, setError] = useState(''),
    [selected, setSelected] = useState<MediaAsset | null>(null);
  const result = useNewsroomResource<MediaPage>(
    session.data,
    `admin/media?page=${page}&size=24`,
    session.data?.role === 'ADMIN',
  );
  const refresh = () =>
    client.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'newsroom' &&
        query.queryKey[1] === session.data?.id &&
        String(query.queryKey[2]).startsWith('admin/media'),
    });
  return (
    <AdminWorkspace title="Media library" active="media">
      <MediaStoragePanel />
      <section className="admin-card">
        <h2>Publication photographs</h2>
        <p>
          {result.data?.total ?? 0} photographs ·{' '}
          {((result.data?.storedBytes ?? 0) / 1048576).toFixed(1)} MB stored
        </p>
        <MediaUpload
          onUploaded={() => {
            setPage(1);
            void refresh();
          }}
        />
        {result.data && (
          <div className="media-allowance">
            <label htmlFor="media-storage">
              Storage allowance · {(result.data.storedBytes / 1048576).toFixed(1)} MB of{' '}
              {(result.data.quotaBytes / 1048576).toFixed(0)} MB
            </label>
            <progress
              id="media-storage"
              value={Math.min(result.data.storedBytes, result.data.quotaBytes)}
              max={Math.max(1, result.data.quotaBytes)}
              style={{ width: '100%', height: 14, accentColor: 'var(--brand-navy)' }}
            />
            {result.data.storedBytes >= result.data.quotaBytes && (
              <p className="field-help">
                The storage allowance is full. Reuse an existing image, remove unused photographs,
                or increase the server allowance before adding new images.
              </p>
            )}
          </div>
        )}
        {(error || result.error) && (
          <p className="inline-error" role="alert">
            {error || result.error?.message}
          </p>
        )}
        {result.isLoading && <p role="status">Loading the media library…</p>}
        <div className="media-grid">
          {result.data?.items.map((asset) => (
            <article className="media-item" key={asset.id}>
              <Image
                src={asset.url}
                unoptimized
                alt={asset.name}
                width={asset.width}
                height={asset.height}
                sizes="(max-width:600px) 85vw,33vw"
              />
              <strong>{asset.name}</strong>
              <p>
                {asset.width} × {asset.height} · {(asset.bytes / 1024).toFixed(0)} KB
              </p>
              <p className="field-help">{asset.storageBackend === 'S3' ? 'Amazon S3' : 'Local storage'} · {asset.archiveEligible ? 'Eligible for GIR' : 'Excluded from GIR'}{asset.retentionSyncPending ? ' · Sync pending' : ''}</p>
              <div className="cms-row-actions">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(asset.url);
                      setError('');
                    } catch {
                      setError('Copy this image address: ' + asset.url);
                    }
                  }}
                >
                  Copy address
                </Button>
                <Button variant="destructive" onClick={() => setSelected(asset)}>
                  Delete unused image
                </Button>
                <Button variant="outline" onClick={async () => {
                  try {
                    await cms(`admin/media/${asset.id}/retention`, 'PATCH', { eligible: !asset.archiveEligible, version: asset.version });
                    setError(''); await refresh();
                  } catch (reason) { setError(reason instanceof Error ? reason.message : 'Retention could not be updated.'); }
                }}>{asset.archiveEligible ? 'Exclude from GIR' : 'Allow GIR transition'}</Button>
              </div>
            </article>
          ))}
        </div>
        <p className="field-help">Exclusions prevent future automatic transitions after synchronization. An object already in GIR stays in its current class.</p>
        <div className="cms-row-actions">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>
          <span>
            Page {result.data?.page ?? page} of {result.data?.pages ?? 1}
          </span>
          <Button
            variant="outline"
            disabled={page >= (result.data?.pages ?? 1)}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
        <ConfirmDialog
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title="Delete unused photograph?"
          description="Images used by an article or retained revision are protected. An unused image will be permanently removed."
          confirmLabel="Delete photograph"
          destructive
          onConfirm={async () => {
            if (!selected) return false;
            try {
              await cms('admin/media/' + selected.id, 'DELETE');
              await refresh();
              return true;
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : 'Image could not be deleted.');
              throw reason;
            }
          }}
        />
      </section>
    </AdminWorkspace>
  );
}
