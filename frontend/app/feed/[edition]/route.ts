import { localizeArticle } from '@/lib/article-locale';
import { xml } from '@/lib/article-index';
import { getArticles } from '@/lib/articles';
import { textLanguage } from '@/lib/language';
import { newest } from '@/lib/news';
import { readerFeeds } from '@/lib/reader-feeds';
import { sectionTitle } from '@/lib/sections';

const feedHeaders = {
  'content-type': 'application/rss+xml; charset=utf-8',
  'cache-control': 'public, max-age=60',
  'x-content-type-options': 'nosniff',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ edition: string }> },
) {
  const { edition } = await params;
  const locale = edition === 'hi.xml' ? 'hi' : edition === 'en.xml' ? 'en' : null;
  if (!locale) return new Response('Feed not found.', { status: 404 });

  const feed = readerFeeds[locale];
  const origin = process.env.SITE_URL ?? 'http://127.0.0.1:3000';
  try {
    const articles = newest(await getArticles())
      .filter(({ demo, publishedAt }) => !demo && Date.parse(publishedAt) <= Date.now())
      .map((article) => localizeArticle(article, locale))
      .filter((article) => textLanguage(article.title) === locale)
      .slice(0, 30);

    const items = articles.map((article) => {
      const canonical = new URL(`/news/${encodeURIComponent(article.slug)}`, origin).href;
      return `<item>
        <title>${xml(article.title)}</title>
        <link>${xml(`${canonical}?lang=${locale}`)}</link>
        <guid isPermaLink="true">${xml(canonical)}</guid>
        <description>${xml(xml(article.summary))}</description>
        <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
        <category>${xml(sectionTitle(article.category, locale))}</category>
      </item>`;
    });
    const channel = new URL('/', origin);
    channel.searchParams.set('lang', locale);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${xml(feed.title)}</title>
<link>${xml(channel.href)}</link>
<description>${xml(feed.description)}</description>
<language>${locale}</language>
<atom:link href="${xml(new URL(feed.url, origin).href)}" rel="self" type="application/rss+xml"/>
${items.join('\n')}
</channel></rss>`,
      { headers: feedHeaders },
    );
  } catch {
    return new Response('Feed temporarily unavailable.', {
      status: 503,
      headers: { 'retry-after': '60', 'cache-control': 'no-store' },
    });
  }
}
