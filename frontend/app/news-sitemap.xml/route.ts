import { articleIndex, xml, type RecentNewsEntry } from '@/lib/article-index';
import { textLanguage } from '@/lib/language';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.SITE_INDEXABLE !== 'true') return new Response(null, { status: 404 });
  const origin = process.env.SITE_URL;
  if (!origin) throw new Error('Set SITE_URL before enabling search indexing.');

  try {
    const recent = await articleIndex<RecentNewsEntry[]>('recent-news');
    if (!recent) throw new Error('The recent news index is unavailable.');
    const now = Date.now();
    const cutoff = now - 48 * 60 * 60 * 1000;
    const entries = recent.flatMap((article) => {
      const publishedAt = Date.parse(article.publishedAt);
      if (!Number.isFinite(publishedAt) || publishedAt < cutoff || publishedAt > now) return [];

      const url = new URL(`/news/${encodeURIComponent(article.slug)}`, origin).href;
      return `<url>
        <loc>${xml(url)}</loc>
        <news:news>
          <news:publication>
            <news:name>UP24Network</news:name>
            <news:language>${textLanguage(article.title)}</news:language>
          </news:publication>
          <news:publication_date>${xml(article.publishedAt)}</news:publication_date>
          <news:title>${xml(article.title)}</news:title>
        </news:news>
      </url>`;
    });
    const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${entries.join('')}</urlset>`;
    return new Response(body, {
      headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'no-store' },
    });
  } catch {
    return new Response('The news sitemap is temporarily unavailable.', {
      status: 503,
      headers: { 'cache-control': 'no-store', 'retry-after': '60' },
    });
  }
}
