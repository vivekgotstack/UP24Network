import Image from 'next/image';
import { brand } from '@/lib/brand';

export function BrandLogo({ eager = false }: { eager?: boolean }) {
  return (
    <span className="brand-wordmark">
      <Image
        src={brand.logoPath}
        width={1098}
        height={351}
        alt=""
        unoptimized
        loading={eager ? 'eager' : 'lazy'}
      />
    </span>
  );
}
