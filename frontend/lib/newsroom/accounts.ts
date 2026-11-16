import { cms, type Account } from '@/lib/cms';

export type AccountScope = 'ALL' | 'STAFF' | 'ADMIN' | 'EDITOR' | 'REPORTER' | 'SUBSCRIBER';
export type AccountPage = {
  items: Account[];
  total: number;
  page: number;
  size: number;
  pages: number;
};
export function accountBrowsePath(search: string, page: number, scope: AccountScope, size = 20) {
  return (
    'admin/accounts/browse?' +
    new URLSearchParams({ q: search, page: String(page), size: String(size), scope })
  );
}
export const accountAdministration = {
  profile: (account: Account, displayName: string, enabled: boolean, version: number) =>
    cms<Account>(`admin/accounts/${account.id}/profile`, 'PATCH', {
      displayName,
      enabled,
      version,
    }),
  revoke: (account: Account) =>
    cms<void>(`admin/accounts/${account.id}/sessions/revoke`, 'POST', {
      version: account.version ?? 0,
    }),
  remove: (account: Account) =>
    cms<void>(`admin/accounts/${account.id}`, 'DELETE', { version: account.version ?? 0 }),
};
