import "server-only";
import { cache } from "react";

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

const apiUrl = process.env.NEWS_API_URL ?? "http://127.0.0.1:8080";

async function request(path: string) {
  return fetch(`${apiUrl}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
}

export const getArticles = cache(async (): Promise<Article[]> => {
  const response = await request("/api/articles");
  if (!response.ok) throw new Error("The newsroom is temporarily unavailable.");
  return response.json();
});

export const getArticle = cache(async (slug: string): Promise<Article | undefined> => {
  const response = await request(`/api/articles/${encodeURIComponent(slug)}`);
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error("The newsroom is temporarily unavailable.");
  return response.json();
});

export function articleDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(new Date(date));
}
