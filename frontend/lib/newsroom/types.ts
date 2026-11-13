import type { Article } from '@/lib/articles';
export type ManagedArticle = {
  id: string;
  authorId: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  manualOverride: boolean;
  version: number;
  article: Article;
};
export type Draft = {
  title: string;
  slug: string;
  summary: string;
  category: string;
  city: string;
  image: string;
  imageAlt: string;
  videoUrl: string;
  youtubeId: string;
  body: string;
};
export type SaveArticle = Draft & { version: number | null };
export const emptyDraft: Draft = {
  title: '',
  slug: '',
  summary: '',
  category: 'Uttar Pradesh',
  city: '',
  image: '',
  imageAlt: '',
  videoUrl: '',
  youtubeId: '',
  body: '',
};
export function toDraft(row?: ManagedArticle | null): Draft {
  return row
    ? {
        title: row.article.title,
        slug: row.article.slug,
        summary: row.article.summary,
        category: row.article.category,
        city: row.article.city,
        image: row.article.image,
        imageAlt: row.article.imageAlt,
        videoUrl: row.article.videoUrl ?? '',
        youtubeId: row.article.youtubeId ?? '',
        body: row.article.paragraphs.join('\n\n'),
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
