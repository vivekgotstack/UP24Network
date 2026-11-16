'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: false,
            refetchOnWindowFocus: true,
          },
          mutations: { retry: false },
        },
      }),
  );
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('up24-identity');
    channel.onmessage = (event) => {
      if (event.data?.type !== 'identity-changed' || event.data?.version !== 1) return;
      void (async () => {
        await Promise.all([
          client.cancelQueries({ queryKey: ['identity', 'session'] }),
          client.cancelQueries({ queryKey: ['newsroom'] }),
        ]);
        client.removeQueries({ queryKey: ['newsroom'] });
        await client.resetQueries({ queryKey: ['identity', 'session'] });
      })().catch(() => {
        /* Query errors are rendered by their consumers. */
      });
    };
    return () => channel.close();
  }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
