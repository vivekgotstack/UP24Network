import type { MetadataRoute } from 'next';
import { newsSections } from '@/lib/sections';
import { publicationNavigation } from '@/lib/publication';
import { cities, regions } from '@/lib/regions';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.SITE_INDEXABLE !== 'true') return [];
  const origin = process.env.SITE_URL!;
  if (!origin) throw new Error('Set SITE_URL before enabling search indexing.');
  return [
    ...[
      '',
      '/latest',
      '/archive',
      '/watch',
      '/sections',
      '/regions',
      ...regions.map((item) => `/region/${item.slug}`),
      ...cities.map((item) => `/city/${item.slug}`),
      ...publicationNavigation.map((item) => item.path),
    ].map((path) => ({
      url: new URL(path || '/', origin).href,
    })),
    ...newsSections
      .filter((s) => s.name !== 'Videos' && s.slug !== 'uttar-pradesh')
      .map((s) => ({ url: new URL(`/section/${s.slug}`, origin).href })),
  ];
}
