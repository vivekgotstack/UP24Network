import { cms, csrfHeaders } from '@/lib/cms';

export type NewsVideo = { id: string; name: string; state: 'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED' | 'DELETING'; originalBytes: number; storedBytes: number; width: number; height: number; durationSeconds: number; url: string; error: string | null; version: number; createdAt: string };
export type VideoPage = { items: NewsVideo[]; total: number; page: number; size: number; pages: number; reservedBytes: number; quotaBytes: number; processingAvailable: boolean; maxUploadBytes: number };
type Ticket = { video: NewsVideo; direct: boolean; uploadUrl: string; headers: Record<string, string>; expiresAt: string };

export async function uploadVideo(file: File, progress: (value: number) => void, signal?: AbortSignal, reserved?: (video: NewsVideo) => void): Promise<NewsVideo> {
  const ticket = await cms<Ticket>('admin/videos/tickets', 'POST', { name: file.name, bytes: file.size });
  reserved?.(ticket.video);
  const headers = ticket.direct ? new Headers(ticket.headers) : await csrfHeaders();
  if (!ticket.direct) headers.set('content-type', 'application/octet-stream');
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', ticket.direct ? ticket.uploadUrl : `/api/video-upload/${ticket.video.id}`);
    request.timeout = 15 * 60 * 1000;
    headers.forEach((value, key) => request.setRequestHeader(key, value));
    request.upload.onprogress = (event) => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    const abort = () => request.abort();
    signal?.addEventListener('abort', abort, { once: true });
    request.onloadend = () => signal?.removeEventListener('abort', abort);
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else {
        let detail = 'The video upload failed. Verify storage access and try a new upload.';
        try { const body = JSON.parse(request.responseText); if (typeof body.detail === 'string') detail = body.detail; } catch { }
        reject(new Error(detail));
      }
    };
    request.onerror = () => reject(new Error(ticket.direct ? 'Direct storage upload failed. Check the S3 CORS policy and network connection.' : 'The video service is temporarily unavailable.'));
    request.ontimeout = () => reject(new Error('Video upload timed out. Try a smaller file or a faster connection.'));
    request.onabort = () => reject(new Error('Video upload was cancelled.'));
    if (signal?.aborted) { reject(new Error('Video upload was cancelled.')); return; }
    request.send(file);
  });
  return cms<NewsVideo>(`admin/videos/${ticket.video.id}/complete`, 'POST', {});
}
