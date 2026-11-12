import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  const origin = process.env.SITE_URL ?? 'http://127.0.0.1:3000';
  return process.env.SITE_INDEXABLE === 'true'
    ? {
        rules: {
          userAgent: '*',
          allow: '/',
          disallow: ['/admin', '/account', '/saved', '/api/', '/search'],
        },
        sitemap: `${origin}/sitemap.xml`,
      }
    : { rules: { userAgent: '*', disallow: '/' } };
}
