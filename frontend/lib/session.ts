'use client';

import useSWR, { useSWRConfig } from 'swr';
import { cms, CmsError, type Account } from '@/lib/cms';

async function session() {
  try {
    return await cms<Account>('auth/me');
  } catch (error) {
    if (error instanceof CmsError && error.status === 401) return null;
    throw error;
  }
}
export function useSession() {
  const result = useSWR<Account | null, CmsError>('auth/me', session, {
    shouldRetryOnError: false,
  });
  const { mutate } = useSWRConfig();
  async function signOut() {
    await cms('auth/logout', 'POST');
    await mutate((key) => Array.isArray(key) && key[0] === 'newsroom', undefined, {
      revalidate: false,
    });
    await result.mutate(null, { revalidate: false });
  }
  return { ...result, signOut };
}
export function useNewsroomResource<T>(
  account: Account | null | undefined,
  path: string,
  permitted = true,
) {
  return useSWR<T, CmsError>(
    account && permitted ? ['newsroom', account.id, path] : null,
    ([, , resource]: [string, string, string]) => cms<T>(resource),
    { shouldRetryOnError: false, keepPreviousData: false },
  );
}
