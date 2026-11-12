import type { Article } from '@/lib/articles';

export function newest(articles: Article[]) {
  return [...articles].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
export function hasVideo(article: Article) {
  return Boolean(article.youtubeId || article.videoUrl);
}
export function pageOf(articles: Article[], rawPage?: string, size = 12) {
  const pages = Math.max(1, Math.ceil(articles.length / size));
  const parsed = Number(rawPage);
  const page = Math.min(pages, Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1);
  return {
    items: articles.slice((page - 1) * size, page * size),
    page,
    pages,
    total: articles.length,
  };
}
export function shortDate(date: string) {
  return new Intl.DateTimeFormat('hi-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date));
}
export function searchStories(articles: Article[], query: string, category = '') {
  const words = query.toLocaleLowerCase('hi-IN').split(/\s+/u).filter(Boolean);
  return newest(articles).filter(
    (article) =>
      (!category || article.category === category) &&
      words.every((word) =>
        `${article.title} ${article.summary} ${article.city} ${article.category}`
          .toLocaleLowerCase('hi-IN')
          .includes(word),
      ),
  );
}
