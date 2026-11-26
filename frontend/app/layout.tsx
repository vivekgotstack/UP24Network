import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import './globals.css';
import { SiteFooter } from '@/components/site-footer';
import { AppFrame } from '@/components/app-frame';
import { PwaInstall } from '@/components/pwa-install';
import { Providers } from '@/components/providers';
import { ThemeBootstrap } from '@/components/theme-bootstrap';
import { getReaderLocale } from '@/lib/reader-locale';
import { appIcons, brand } from '@/lib/brand';
import { readerFeeds } from '@/lib/reader-feeds';

const indexable = process.env.SITE_INDEXABLE === 'true';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://127.0.0.1:3000'),
  title: { default: `${brand.name} | खबर हमारी यकीन आपका`, template: `%s | ${brand.name}` },
  description: 'उत्तर प्रदेश, देश और दुनिया की खबरें, जमीनी रिपोर्ट और वीडियो।',
  applicationName: brand.name,
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: brand.name, statusBarStyle: 'default' },
  publisher: brand.name,
  alternates: {
    types: {
      'application/rss+xml': Object.values(readerFeeds).map(({ url, title }) => ({ url, title })),
    },
  },
  openGraph: { siteName: brand.name, locale: 'hi_IN', type: 'website' },
  icons: { icon: appIcons.favicon, apple: appIcons.touch },
  robots: { index: indexable, follow: indexable },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: brand.themeColor };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const [locale, requestHeaders] = await Promise.all([getReaderLocale(), headers()]);
  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeBootstrap nonce={requestHeaders.get('x-nonce') ?? undefined} />
      </head>
      <body id="top">
        <Providers>
          <AppFrame locale={locale} footer={<SiteFooter />}>
            {children}
          </AppFrame>
          <PwaInstall locale={locale} />
        </Providers>
      </body>
    </html>
  );
}
