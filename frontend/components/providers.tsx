'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: false, refetchOnWindowFocus: true },
    mutations: { retry: false },
  } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
