import Image from 'next/image';
import Link from 'next/link';

export function EditionArt() {
  return (
    <section className="edition-art" aria-label="UP24Network editorial identity">
      <Image
        src="/brand/newsroom-banner-balanced.png"
        alt="उत्तर प्रदेश के ऐतिहासिक स्थलों और राजनीतिक जीवन का संपादकीय चित्रण"
        fill
        sizes="(max-width: 1280px) 100vw, 1180px"
      />
      <Link href="/about">
        UP24Network <span>खबर हमारी यकीन आपका</span>
      </Link>
    </section>
  );
}
