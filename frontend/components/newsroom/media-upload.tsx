'use client';
import { useState } from 'react';
import { uploadPhotograph, type MediaAsset } from '@/lib/newsroom/media';

export function MediaUpload({
  onUploaded,
  disabled = false,
}: {
  onUploaded: (asset: MediaAsset) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <div className="media-upload" aria-busy={busy}>
      <label>
        Upload a photograph
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={disabled || busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError('');
            try {
              if (file.size > 12 * 1024 * 1024)
                throw new Error('Choose a photograph smaller than 12 MB.');
              onUploaded(await uploadPhotograph(file));
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : 'Upload failed.');
            } finally {
              setBusy(false);
              event.target.value = '';
            }
          }}
        />
      </label>
      <p className="field-help">
        {busy
          ? 'Optimizing and saving…'
          : 'Photographs are optimized as WebP, kept in full proportions and stored once.'}
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
