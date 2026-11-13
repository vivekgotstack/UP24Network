import Image from 'next/image';
import officialLogo from '@/public/brand/up24-logo.png';

/** Keep the official mark lossless; its asset hash refreshes cached copies. */
export function BrandLogo({ eager = false }: { eager?: boolean }) {
  return <Image src={officialLogo} alt="" unoptimized loading={eager ? 'eager' : 'lazy'} />;
}
