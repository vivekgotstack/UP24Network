import type { Metadata } from 'next';
import { connection } from 'next/server';
import './globals.css';
import { ReadingProgress } from '@/components/reading-progress';
import { SiteFooter } from '@/components/site-footer';
import { Providers } from '@/components/providers';
import { brand } from '@/lib/brand';

const indexable = process.env.SITE_INDEXABLE === 'true';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://127.0.0.1:3000'),
  title: { default: 'UP24Network | खबर हमारी यकीन आपका', template: '%s | UP24Network' },
  description: 'उत्तर प्रदेश, देश और दुनिया की खबरें, जमीनी रिपोर्ट और वीडियो।',
  applicationName: brand.name,
  publisher: brand.name,
  openGraph: { siteName: brand.name, locale: 'hi_IN', type: 'website' },
  icons: { icon: '/brand/up24-logo.png', apple: '/brand/up24-logo.png' },
  robots: { index: indexable, follow: indexable },
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="hi" data-scroll-behavior="smooth">
      <body id="top">
        <Providers>
          <ReadingProgress />
          <div className="site-shell">
            {children}
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
