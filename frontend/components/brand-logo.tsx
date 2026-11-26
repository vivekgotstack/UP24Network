import Image from 'next/image';
import officialLogo from '@/public/brand/the-morning-express-logo.jpg';

/** Render the supplied artwork without cropping or re-encoding it. */
export function BrandLogo({ eager = false }: { eager?: boolean }) {
  return <Image src={officialLogo} alt="" unoptimized loading={eager ? 'eager' : 'lazy'} />;
}
