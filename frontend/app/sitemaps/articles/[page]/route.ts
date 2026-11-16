import { articleIndex, xml, type ArticleIndexEntry } from '@/lib/article-index';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ page: string }> }) {
  const { page } = await context.params;
  const headers = { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'no-store' };
  if (process.env.SITE_INDEXABLE !== 'true' || !/^[1-9][0-9]{0,5}$/.test(page)) return new Response(null, { status: 404 });
  const origin = process.env.SITE_URL;
  if (!origin) throw new Error('Set SITE_URL before enabling search indexing.');
  try {
    const articles = await articleIndex<ArticleIndexEntry[]>(Number(page));
    if (!articles?.length) return new Response(null, { status: 404, headers });
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${articles.map((article) => `<url><loc>${xml(new URL(`/news/${encodeURIComponent(article.slug)}`, origin).href)}</loc><lastmod>${xml(article.updatedAt)}</lastmod></url>`).join('')}</urlset>`, { headers });
  } catch {
    return new Response('The sitemap is temporarily unavailable.', { status: 503, headers: { 'cache-control': 'no-store', 'retry-after': '60' } });
  }
}
