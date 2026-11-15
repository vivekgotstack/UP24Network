import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'UP24Network',
    short_name: 'UP24Network',
    description: 'उत्तर प्रदेश, भारत और दुनिया की खबरें। खबर हमारी यकीन आपका।',
    lang: 'hi',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6f5f0',
    theme_color: '#071c36',
    orientation: 'any',
    categories: ['news', 'magazines'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'ताजा खबरें',
        url: '/latest',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      { name: 'वीडियो', url: '/watch', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
