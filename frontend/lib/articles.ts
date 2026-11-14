import 'server-only';
import { cache } from 'react';

export type Article = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  city: string;
  author: string;
  publishedAt: string;
  readingMinutes: number;
  image: string;
  imageAlt: string;
  videoUrl: string | null;
  paragraphs: string[];
  demo: boolean;
  youtubeId: string | null;
  breaking: boolean;
  sourceUrl: string | null;
};

const apiUrl = process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080';

async function request(path: string) {
  return fetch(`${apiUrl}${path}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
}

export const getArticles = cache(async (): Promise<Article[]> => {
  const response = await request('/api/articles');
  if (!response.ok) throw new Error('The newsroom is temporarily unavailable.');
  return response.json();
});

export const getArticle = cache(async (slug: string): Promise<Article | undefined> => {
  const response = await request(`/api/articles/${encodeURIComponent(slug)}`);
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error('The newsroom is temporarily unavailable.');
  return response.json();
});

export type ArticlePage = {
  items: Article[];
  total: number;
  page: number;
  size: number;
  pages: number;
};
export type ArticleFilters = {
  region?: string;
  categories?: string[];
  cities?: string[];
  q?: string;
  videoOnly?: boolean;
  page?: string;
  size?: number;
};
export async function getArticlePage(filters: ArticleFilters = {}): Promise<ArticlePage> {
  const parameters = new URLSearchParams();
  if (filters.region) parameters.set('region', filters.region);
  for (const category of filters.categories ?? []) parameters.append('category', category);
  for (const city of filters.cities ?? []) parameters.append('city', city);
  if (filters.q) parameters.set('q', filters.q.slice(0, 200));
  if (filters.videoOnly) parameters.set('videoOnly', 'true');
  const page = Number(filters.page);
  parameters.set(
    'page',
    String(Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1),
  );
  parameters.set('size', String(filters.size ?? 12));
  const response = await request(`/api/articles/browse?${parameters}`);
  if (!response.ok) throw new Error('The news library is temporarily unavailable.');
  return response.json();
}

export function articleDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date));
}
