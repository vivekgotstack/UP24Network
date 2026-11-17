'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useSession, useNewsroomResource } from '@/lib/session';
import { cms } from '@/lib/cms';
import type { NewsVideo, VideoPage } from '@/lib/newsroom/videos';
import { VideoUpload } from './video-upload';
import styles from './video-library.module.css';

export function VideoLibraryPanel() {
  const session = useSession();
  const [page, setPage] = useState(1), [error, setError] = useState(''), [selected, setSelected] = useState<NewsVideo | null>(null);
  const result = useNewsroomResource<VideoPage>(session.data, `admin/videos?page=${page}&size=12`, session.data?.role === 'ADMIN', { refetchInterval: 10000 });
  return <section className={`admin-card ${styles.panel}`}>
    <div><p className="eyebrow">VIDEO DESK</p><h2>Video library</h2><p>Upload once, track processing and reuse the playback address. Videos referenced by reports or retained revisions are protected from removal.</p></div>
    <VideoUpload onQueued={() => { setPage(1); void result.refetch(); }} />
    {result.data && <p className="field-help">{result.data.total} videos · {(result.data.reservedBytes / 1073741824).toFixed(2)} GiB reserved of {(result.data.quotaBytes / 1073741824).toFixed(0)} GiB. Uploads reserve space for the original and playback copy.</p>}
    {(error || result.error) && <p className="inline-error" role="alert">{error || result.error?.message}</p>}
    <div className={styles.grid}>{result.data?.items.map((video) => <article className={styles.card} key={video.id}>
      <strong>{video.name}</strong><p className="field-help">{video.state.toLowerCase()} · {(video.originalBytes / 1048576).toFixed(1)} MiB original</p>
      {video.state === 'READY' && <><video controls preload="none" src={video.url} aria-label={video.name} /><p className="field-help">{video.width} × {video.height} · {Math.ceil(video.durationSeconds)} seconds · {(video.storedBytes / 1048576).toFixed(1)} MiB playback</p></>}
      {video.error && <p className="inline-error">{video.error}</p>}
      <div className={styles.actions}>
        {video.state === 'READY' && <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(video.url); setError(''); } catch { setError('Video address: ' + video.url); } }}>Copy video address</Button>}
        {video.state === 'FAILED' && <Button variant="outline" onClick={async () => { try { await cms(`admin/videos/${video.id}/retry`, 'POST', { version: video.version }); await result.refetch(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Retry failed.'); } }}>Retry processing</Button>}
        <Button variant="destructive" disabled={video.state === 'PROCESSING'} onClick={() => setSelected(video)}>{video.state === 'DELETING' ? 'Retry removal' : 'Remove unused video'}</Button>
      </div>
    </article>)}</div>
    <div className={styles.actions}><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {result.data?.page ?? page} of {result.data?.pages ?? 1}</span><Button variant="outline" disabled={page >= (result.data?.pages ?? 1)} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
    <ConfirmDialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }} title="Remove this unused video?" description="Referenced videos are protected. Removal of the private original and playback object is queued and retried if storage is unavailable." confirmLabel="Queue removal" destructive onConfirm={async () => {
      if (!selected) return false;
      try { await cms(`admin/videos/${selected.id}`, 'DELETE'); await result.refetch(); return true; }
      catch (reason) { setError(reason instanceof Error ? reason.message : 'Removal could not be queued.'); throw reason; }
    }} />
  </section>;
}
