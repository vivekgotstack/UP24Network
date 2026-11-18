import type { Article } from '@/lib/articles';
export type ManagedArticle = {
  id: string;
  authorId: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'TRASH';
  manualOverride: boolean;
  version: number;
  article: Article;
  sourceNotes: string;
  region: string;
};
export type Draft = {
  title: string;
  slug: string;
  summary: string;
  category: string;
  city: string;
  region: string;
  image: string;
  imageAlt: string;
  videoUrl: string;
  youtubeId: string;
  reelUrl: string;
  body: string;
  sourceNotes: string;
  byline: string;
};
export type SaveArticle = Omit<Draft, 'reelUrl'> & {
  version: number | null;
  reelUrl?: string | null;
};
export const emptyDraft: Draft = {
  title: '',
  slug: '',
  summary: '',
  category: 'Uttar Pradesh',
  city: '',
  region: '',
  image: '',
  imageAlt: '',
  videoUrl: '',
  youtubeId: '',
  reelUrl: '',
  body: '',
  sourceNotes: '',
  byline: '',
};
export function toDraft(row?: ManagedArticle | null): Draft {
  return row
    ? {
        title: row.article.title,
        slug: row.article.slug,
        summary: row.article.summary,
        category: row.article.category,
        city: row.article.city,
        region: row.region ?? '',
        image: row.article.image,
        imageAlt: row.article.imageAlt,
        videoUrl: row.article.videoUrl ?? '',
        youtubeId: row.article.youtubeId ?? '',
        reelUrl: row.article.reelUrl ?? '',
        body: row.article.paragraphs.join('\n\n'),
        sourceNotes: row.sourceNotes ?? '',
        byline: row.article.author,
      }
    : { ...emptyDraft };
}
export function slugify(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 500);
}
export function videoId(input: string) {
  if (!input || /^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (
      url.protocol !== 'https:' ||
      ![
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'youtu.be',
        'www.youtube-nocookie.com',
      ].includes(url.hostname)
    )
      throw new Error();
    const id =
      url.hostname === 'youtu.be'
        ? url.pathname.slice(1)
        : (url.searchParams.get('v') ?? url.pathname.split('/').pop() ?? '');
    if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
  } catch {}
  throw new Error('Enter a valid YouTube video ID or HTTPS YouTube link.');
}
export function allowedMedia(input: string, image = true) {
  if (!input) return true;
  if (image && /^\/media\/[a-f0-9]{64}\.webp$/.test(input)) return true;
  if (
    !image &&
    /^\/media\/videos\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.mp4$/.test(
      input,
    )
  )
    return true;
  if (/^\/(images|brand|videos)\/[A-Za-z0-9._/-]+$/.test(input) && !input.includes('..'))
    return true;
  try {
    const url = new URL(input);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (['www.up24network.com', 'up24network.com'].includes(url.hostname) ||
        (image &&
          ['i.ytimg.com', 'i1.ytimg.com', 'i2.ytimg.com', 'i3.ytimg.com', 'i4.ytimg.com'].includes(
            url.hostname,
          )))
    );
  } catch {
    return false;
  }
}
