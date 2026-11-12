'use client';

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
const options = { dedupingInterval: 5000, revalidateOnFocus: true };
export function Providers({ children }: { children: ReactNode }) {
  return <SWRConfig value={options}>{children}</SWRConfig>;
}
