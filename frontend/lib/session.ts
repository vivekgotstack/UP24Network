'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cms, CmsError, type Account } from '@/lib/cms';

const sessionKey = ['identity', 'session'] as const;
async function session(signal?: AbortSignal) {
  try {
    return await cms<Account>('auth/me', 'GET', undefined, { signal });
  } catch (error) {
    if (error instanceof CmsError && error.status === 401) return null;
    throw error;
  }
}
export function useSession() {
  const client = useQueryClient();
  const result = useQuery<Account | null, CmsError>({ queryKey: sessionKey,
    queryFn: ({ signal }) => session(signal), staleTime: 15_000 });
  const setAccount = useCallback(async (account: Account | null) => {
    await client.cancelQueries({ queryKey: ['newsroom'] });
    client.removeQueries({ queryKey: ['newsroom'] });
    client.setQueryData(sessionKey, account);
  }, [client]);
  async function signOut(everywhere = false) {
    await cms(everywhere ? 'auth/logout-all' : 'auth/logout', 'POST');
    await setAccount(null);
  }
  return { ...result, setAccount, signOut };
}
export function useNewsroomResource<T>(
  account: Account | null | undefined,
  path: string,
  permitted = true,
) {
  const client = useQueryClient();
  const key = ['newsroom', account?.id, path] as const;
  const result = useQuery<T, CmsError>({ queryKey: key,
    queryFn: ({ signal }) => cms<T>(path, 'GET', undefined, { signal }), enabled: Boolean(account && permitted) });
  const refresh = useCallback(() => account && permitted ? result.refetch() : Promise.resolve(undefined), [account,permitted,result.refetch]);
  return { ...result, refetch: refresh, setData: (data: T) => client.setQueryData(key, data) };
}
