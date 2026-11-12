'use client';

import Image from 'next/image';
import { useState } from 'react';

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
  const fallback = !src || src === '/brand/up24-logo.png' || failed === src;
  if (fallback)
    return (
      <div
        className="media-placeholder"
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        <span className="brand-badge">
          <Image src="/brand/up24-logo.png" alt="" width={180} height={180} />
        </span>
        <span lang="hi">खबर हमारी यकीन आपका</span>
      </div>
    );
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={priority}
      onError={() => setFailed(src)}
    />
  );
}
