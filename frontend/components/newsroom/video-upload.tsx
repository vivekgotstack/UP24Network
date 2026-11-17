'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession, useNewsroomResource } from '@/lib/session';
import { cms } from '@/lib/cms';
import { uploadVideo, type NewsVideo, type VideoPage } from '@/lib/newsroom/videos';
import styles from './video-library.module.css';
import { Button } from '@/components/ui/button';

export function VideoUpload({ onReady, onQueued, disabled = false }: { onReady?: (video: NewsVideo) => void; onQueued?: () => void; disabled?: boolean }) {
  const session = useSession();
  const availability = useNewsroomResource<VideoPage>(session.data, 'admin/videos?page=1&size=1', !!session.data?.newsroomAccess);
  const [video, setVideo] = useState<NewsVideo | null>(null), [progress, setProgress] = useState<number | null>(null), [error, setError] = useState('');
  const callbacks = useRef({ onReady, onQueued }); callbacks.current = { onReady, onQueued };
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!video || !['QUEUED', 'PROCESSING'].includes(video.state)) return;
    let active = true;
    const controller = new AbortController();
    const timer = window.setInterval(() => {
      void cms<NewsVideo>(`admin/videos/${video.id}`, 'GET', undefined, { signal: controller.signal }).then((next) => {
        if (!active) return; setVideo(next);
        if (next.state === 'READY') callbacks.current.onReady?.(next);
      }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Video status could not be loaded.'); });
    }, 5000);
    return () => { active = false; window.clearInterval(timer); controller.abort(); };
  }, [video?.id, video?.state]);
  const processing = video && ['QUEUED', 'PROCESSING'].includes(video.state);
  return <div className={styles.upload} aria-busy={progress !== null || !!processing}>
    <label>Upload a video<input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" disabled={disabled || progress !== null || !!processing || !availability.data?.processingAvailable}
      onChange={async (event) => {
        const input = event.currentTarget, file = input.files?.[0]; if (!file) return;
        setError(''); setVideo(null); setProgress(0); abort.current = new AbortController();
        try {
          if (file.size > (availability.data?.maxUploadBytes ?? 250 * 1024 * 1024)) throw new Error('Choose a video within the displayed upload limit.');
          const next = await uploadVideo(file, setProgress, abort.current.signal, setVideo); setVideo(next); callbacks.current.onQueued?.();
          if (next.state === 'READY') callbacks.current.onReady?.(next);
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Video upload failed.'); }
        finally { setProgress(null); input.value = ''; abort.current = null; }
      }} /></label>
    <p className="field-help">MP4/MOV · up to {Math.round((availability.data?.maxUploadBytes ?? 250 * 1024 * 1024) / 1048576)} MiB · 15 minutes. A web playback copy is prepared without cropping; the original remains private.</p>
    {availability.data && !availability.data.processingAvailable && <p className="field-help">Video processing is not available on this backend. Configure ffmpeg and ffprobe; Docker includes both tools.</p>}
    {progress !== null && <><progress max={100} value={progress} aria-label="Video upload progress" /><p role="status">Uploading video… {progress}%</p></>}
    {progress !== null && <Button type="button" variant="outline" onClick={() => abort.current?.abort()}>Cancel transfer</Button>}
    {video?.state === 'UPLOADING' && progress === null && <Button type="button" variant="outline" onClick={async () => {
      try { await cms(`admin/videos/${video.id}`, 'DELETE'); setVideo(null); setError(''); await availability.refetch(); }
      catch (reason) { setError(reason instanceof Error ? reason.message : 'Upload reservation could not be discarded.'); }
    }}>Discard unfinished upload</Button>}
    {processing && <p role="status">{video.state === 'QUEUED' ? 'Video queued for processing.' : 'Preparing the playback copy…'} You can continue editing while this runs.</p>}
    {video?.state === 'READY' && <p role="status">Video ready{onReady ? ' and selected for this report' : ''}.</p>}
    {(error || video?.error || availability.error) && <p className="inline-error" role="alert">{error || video?.error || availability.error?.message}</p>}
  </div>;
}
