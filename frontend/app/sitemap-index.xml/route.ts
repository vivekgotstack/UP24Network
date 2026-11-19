import { articleIndex, xml } from '@/lib/article-index';

export const dynamic = 'force-dynamic';
export async function GET() {
  const origin = process.env.SITE_URL;
  const headers = { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'no-store' };
  if (process.env.SITE_INDEXABLE !== 'true')
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',
      { headers },
    );
  if (!origin) throw new Error('Set SITE_URL before enabling search indexing.');
  try {
    const manifest = await articleIndex<{ articles: number; pages: number }>();
    // The protocol permits 50,000 sitemap entries. At 1,000 reports per file,
    // this covers nearly 50 million articles without loading their bodies.
    const pages = Math.min(manifest?.pages ?? 0, 49998);
    const paths = [
      '/sitemap.xml',
      '/news-sitemap.xml',
      ...Array.from({ length: pages }, (_, page) => `/sitemaps/articles/${page + 1}`),
    ];
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<sitemap><loc>${xml(new URL(path, origin).href)}</loc></sitemap>`).join('')}</sitemapindex>`,
      { headers },
    );
  } catch {
    return new Response('The sitemap is temporarily unavailable.', {
      status: 503,
      headers: { 'cache-control': 'no-store', 'retry-after': '60' },
    });
  }
}
