import type { MetadataRoute } from 'next';
import { appIcons, brand } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: brand.name,
    short_name: brand.name,
    description: 'उत्तर प्रदेश, भारत और दुनिया की खबरें। खबर हमारी यकीन आपका।',
    lang: 'hi',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fff8f1',
    theme_color: brand.themeColor,
    orientation: 'any',
    categories: ['news', 'magazines'],
    icons: [
      { src: appIcons.standard, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: appIcons.large, sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: appIcons.large,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'ताजा खबरें',
        url: '/latest',
        icons: [{ src: appIcons.standard, sizes: '192x192' }],
      },
      { name: 'वीडियो', url: '/watch', icons: [{ src: appIcons.standard, sizes: '192x192' }] },
    ],
  };
}
