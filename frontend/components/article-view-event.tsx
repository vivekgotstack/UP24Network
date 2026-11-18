'use client';

import { useEffect, useRef } from 'react';
import { cms } from '@/lib/cms';

export function ArticleViewEvent({ slug }: { slug: string }) {
  const sent = useRef(false);

  useEffect(() => {
    function record() {
      if (sent.current || document.visibilityState !== 'visible') return;
      sent.current = true;
      void cms<void>(`articles/${encodeURIComponent(slug)}/view`, 'POST').catch(() => undefined);
    }

    document.addEventListener('visibilitychange', record);
    record();
    return () => document.removeEventListener('visibilitychange', record);
  }, [slug]);

  return null;
}
