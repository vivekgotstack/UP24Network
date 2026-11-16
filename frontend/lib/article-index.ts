import 'server-only';

const api = process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080';
export type ArticleIndexEntry = { slug: string; updatedAt: string };
export async function articleIndex<T>(page?: number): Promise<T | undefined> {
  const response = await fetch(`${api}/api/articles/index${page === undefined ? '' : `/${page}`}`, {
    cache: 'no-store', signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error('The article index is temporarily unavailable.');
  return response.json();
}
export function xml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
}
