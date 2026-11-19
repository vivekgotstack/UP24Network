import { useState } from 'react';
import { NewsImage } from '@/components/news-image';
import { EditorialVideoPreview } from '@/components/newsroom/editorial-video-preview';
import { MediaUpload } from '@/components/newsroom/media-upload';
import { VideoUpload } from '@/components/newsroom/video-upload';
import { Button } from '@/components/ui/button';
import { allowedMedia, type Draft } from '@/lib/newsroom/types';
import styles from './article-media-fields.module.css';

const formats = {
  photo: 'Photograph',
  upload: 'Upload a video',
  youtube: 'YouTube video',
  hosted: 'Hosted video file',
};
type MediaFormat = keyof typeof formats;
type MediaKey = 'reelUrl' | 'image' | 'imageAlt' | 'mediaCredit' | 'videoUrl' | 'youtubeId';

function previewImageUrl(image: string) {
  if (!image || !allowedMedia(image)) return '';
  if (image.startsWith('/')) return image;
  // Reuse the remote locations supported by the Next.js image optimizer.
  const url = new URL(image);
  const pathPrefix = url.hostname.endsWith('.ytimg.com') ? '/vi/' : '/wp-content/uploads/';
  return !url.port && url.pathname.startsWith(pathPrefix) ? image : '';
}

export function ArticleMediaFields({
  draft,
  reelArticle,
  adminMode,
  busy,
  assisting,
  helpersAllowed,
  requireMediaCredit,
  set,
  onVideoDetails,
}: {
  draft: Draft;
  reelArticle: boolean;
  adminMode: boolean;
  busy: boolean;
  assisting: boolean;
  helpersAllowed: boolean;
  requireMediaCredit: boolean;
  set: (key: MediaKey, value: string) => void;
  onVideoDetails: () => void;
}) {
  const [preferredFormat, setPreferredFormat] = useState<MediaFormat>('photo');
  const videoUrl = draft.videoUrl.trim();
  const youtube = draft.youtubeId.trim();
  const image = previewImageUrl(draft.image.trim());
  const videoFormat = videoUrl
    ? preferredFormat !== 'hosted' && videoUrl.startsWith('/media/videos/')
      ? 'upload'
      : 'hosted'
    : null;
  const format = youtube ? 'youtube' : (videoFormat ?? preferredFormat);
  const photoUpload = (
    <MediaUpload disabled={busy} onUploaded={(asset) => updatePhotograph(asset.url)} />
  );
  const creditField = (
    <label>
      {reelArticle ? 'Public Reel creator credit' : 'Public media credit'}
      <input
        name="mediaCredit"
        maxLength={240}
        value={draft.mediaCredit}
        onChange={(event) => set('mediaCredit', event.target.value)}
        placeholder={
          reelArticle
            ? 'Creator name or Instagram handle'
            : 'Photographer, videographer, or organization'
        }
      />
      <span className="field-help">
        {requireMediaCredit ? 'Required for review when this report includes media. ' : ''}
        {reelArticle
          ? 'Name the creator of the original Reel.'
          : 'Credit each asset that appears in the report.'}
      </span>
    </label>
  );
  const photograph =
    image && !image.startsWith('/brand/') ? (
      <figure className={styles.photograph}>
        <div>
          <NewsImage
            src={image}
            alt={draft.imageAlt.trim() || 'Selected photograph'}
            sizes="(max-width: 600px) 100vw, 512px"
          />
        </div>
        {draft.mediaCredit && <figcaption>{draft.mediaCredit}</figcaption>}
      </figure>
    ) : undefined;

  if (reelArticle) {
    return (
      <fieldset className={`media-fields ${styles.fields}`} disabled={busy}>
        <legend>Instagram Reel</legend>
        <label>
          Public Reel link
          <input
            name="reelUrl"
            type="url"
            required
            maxLength={2000}
            value={draft.reelUrl}
            onChange={(event) => {
              const value = event.target.value;
              set('reelUrl', value);
              if (value.trim() !== draft.reelUrl.trim()) set('mediaCredit', '');
            }}
            placeholder="https://www.instagram.com/reel/ABC123/"
          />
          <span className="field-help">Readers open the original Reel on Instagram.</span>
        </label>
        {creditField}
        <EditorialVideoPreview
          title={draft.title.trim() || 'Reel preview'}
          image=""
          reel={draft.reelUrl}
        />
      </fieldset>
    );
  }

  function selectFormat(next: MediaFormat) {
    setPreferredFormat(next);
    set('youtubeId', '');
    set('videoUrl', '');
    if (youtube || videoUrl) set('mediaCredit', '');
  }

  function updateVideoSource(key: 'youtubeId' | 'videoUrl', value: string) {
    setPreferredFormat(format);
    set(key, value);
    set(key === 'youtubeId' ? 'videoUrl' : 'youtubeId', '');
    if (value.trim() !== draft[key].trim()) set('mediaCredit', '');
  }

  function updatePhotograph(value: string) {
    set('image', value);
    if (value.trim() !== draft.image.trim()) {
      set('imageAlt', '');
      set('mediaCredit', '');
    }
  }

  const mediaControls = (
    <>
      <label>
        Lead format
        <select
          name="leadFormat"
          value={format}
          onChange={(event) => selectFormat(event.target.value as MediaFormat)}
        >
          {Object.entries(formats).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="field-help">Changing format clears the previous video selection.</span>
      </label>
      {format === 'upload' && (
        <VideoUpload
          disabled={busy}
          onReady={(video) => updateVideoSource('videoUrl', video.url)}
        />
      )}
      {format === 'youtube' && (
        <>
          <label>
            YouTube link or video ID
            <input
              name="youtubeId"
              maxLength={2000}
              value={draft.youtubeId}
              onChange={(event) => updateVideoSource('youtubeId', event.target.value)}
              placeholder="YouTube link or 11-character ID"
            />
          </label>
          {helpersAllowed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={styles.detailsButton}
              disabled={!youtube || assisting}
              onClick={onVideoDetails}
            >
              {assisting ? 'Fetching video details…' : 'Fetch video details'}
            </Button>
          )}
        </>
      )}
      {format === 'hosted' && (
        <label>
          Direct video source
          <input
            name="videoUrl"
            maxLength={2000}
            value={draft.videoUrl}
            onChange={(event) => updateVideoSource('videoUrl', event.target.value)}
            placeholder="/videos/report.mp4 or an approved HTTPS URL"
          />
        </label>
      )}
      {(!adminMode || format !== 'photo') && photoUpload}
      <label>
        {format === 'photo' ? 'Photograph address' : 'Video poster address'}
        <input
          name="image"
          maxLength={2000}
          value={draft.image}
          onChange={(event) => updatePhotograph(event.target.value)}
          placeholder="/images/report.jpg or an approved HTTPS URL"
        />
        {format !== 'photo' && (
          <span className="field-help">Optional photograph for the player and story cards.</span>
        )}
      </label>
      <label>
        Image description
        <input
          name="imageAlt"
          maxLength={500}
          value={draft.imageAlt}
          onChange={(event) => set('imageAlt', event.target.value)}
          placeholder="Describe what the photograph shows"
        />
        <span className="field-help">Screen readers use this description.</span>
      </label>
      {creditField}
    </>
  );

  return (
    <fieldset className={`media-fields ${styles.fields}`} disabled={busy}>
      <legend>{adminMode ? 'Lead media (optional)' : 'Lead media'}</legend>
      {adminMode ? (
        <>
          {format === 'photo' && photoUpload}
          <details className={styles.details}>
            <summary>Media format and details</summary>
            <div className={styles.controls}>{mediaControls}</div>
          </details>
        </>
      ) : (
        mediaControls
      )}
      <EditorialVideoPreview
        title={draft.title.trim() || 'Media preview'}
        image={image}
        youtube={youtube}
        direct={videoUrl}
        fallback={photograph}
      />
    </fieldset>
  );
}
