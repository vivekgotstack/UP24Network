import Image from 'next/image';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import bannerArtwork from '@/public/brand/newsroom-banner-balanced.png';
import { copy, type SiteLocale } from '@/lib/locale';
import { textLanguage } from '@/lib/language';

export function EditionArt({
  sizes = '(max-width: 1400px) 100vw, 1304px',
  tagline = 'खबर हमारी यकीन आपका',
  locale = 'hi',
}: {
  sizes?: string;
  tagline?: string;
  locale?: SiteLocale;
}) {
  return (
    <section className="edition-art" aria-label={copy(locale, 'TheMorningExpress की संपादकीय पहचान', 'TheMorningExpress editorial identity')}>
      <Image
        className="edition-artwork"
        src={bannerArtwork}
        alt={copy(locale, 'उत्तर प्रदेश के ऐतिहासिक स्थलों और राजनीतिक जीवन का चित्रण', 'Illustration of Uttar Pradesh landmarks and political life')}
        sizes={sizes}
      />
      <Link href="/about" className="edition-identity" aria-label={copy(locale, 'TheMorningExpress के बारे में', 'About TheMorningExpress')}>
        <span className="edition-logo">
          <BrandLogo />
        </span>
        <span className="edition-tagline" lang={textLanguage(tagline)}>{tagline}</span>
      </Link>
    </section>
  );
}
