import Image from 'next/image';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import bannerArtwork from '@/public/brand/newsroom-banner-balanced.png';

export function EditionArt() {
  return (
    <section className="edition-art" aria-label="UP24Network editorial identity">
      <Image
        className="edition-artwork"
        src={bannerArtwork}
        alt="उत्तर प्रदेश के ऐतिहासिक स्थलों और राजनीतिक जीवन का संपादकीय चित्रण"
        sizes="(max-width: 1400px) 100vw, 1304px"
      />
      <Link href="/about" className="edition-identity" aria-label="UP24Network के बारे में">
        <span className="edition-logo">
          <BrandLogo />
        </span>
        <span className="edition-tagline">खबर हमारी यकीन आपका</span>
      </Link>
    </section>
  );
}
