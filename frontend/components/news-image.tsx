'use client';

import Image from 'next/image';
import { useState } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { isBrandPlaceholder } from '@/lib/brand';

export function NewsImage({
  src,
  alt = '',
  priority = false,
  sizes = '(max-width: 700px) 100vw, 33vw',
}: {
  src: string;
  alt?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const fallback = !src || isBrandPlaceholder(src) || failed === src;
  if (fallback)
    return (
      <div
        className="media-placeholder"
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        <span className="brand-badge">
          <BrandLogo />
        </span>
        <span lang="hi">खबर हमारी यकीन आपका</span>
      </div>
    );
  return (
    <Image
      src={src}
      unoptimized={src.startsWith('/media/')}
      alt={alt}
      fill
      sizes={sizes}
      preload={priority}
      onError={() => setFailed(src)}
    />
  );
}
