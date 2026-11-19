import { cms } from '@/lib/cms';
import type { ManagedArticle, SaveArticle } from '@/lib/newsroom/types';

export type DeskPage = {
  items: ManagedArticle[];
  total: number;
  page: number;
  size: number;
  pages: number;
  counts: Record<ManagedArticle['status'], number>;
};
export type EditorialActor = { name: string; role: string };
export type ArticleRevision = {
  version: number;
  savedAt: string;
  title: string;
  status: string;
  actorId: string | null;
  actor?: EditorialActor | null;
};
export type ArticleActivity = {
  id: string;
  action: string;
  actorId: string | null;
  actor?: EditorialActor | null;
  version: number;
  occurredAt: string;
};
export type LifecycleAction = 'ARCHIVE' | 'TRASH' | 'RESTORE';
export function articlePagePath(status = 'ALL', q = '', page = 1, size = 20) {
  return `admin/articles/browse?${new URLSearchParams({ status, q, page: String(page), size: String(size) })}`;
}

/** Editorial transport adapter. Components depend on commands, not HTTP details. */
export const articleDesk = {
  find: (id: string) => cms<ManagedArticle>(`admin/articles/${id}`),
  save: (id: string | undefined, input: SaveArticle) =>
    cms<ManagedArticle>(id ? `admin/articles/${id}` : 'admin/articles', id ? 'PUT' : 'POST', input),
  continueStory: (id: string) => cms<ManagedArticle>(`admin/articles/${id}/continuations`, 'POST'),
  publish: (article: ManagedArticle, published: boolean, breaking: boolean) =>
    cms<ManagedArticle>(`admin/articles/${article.id}/publication`, 'POST', {
      version: article.version,
      published,
      breaking,
    }),
  lifecycle: (article: ManagedArticle, action: LifecycleAction) =>
    cms<ManagedArticle>(`admin/articles/${article.id}/lifecycle`, 'POST', {
      version: article.version,
      action,
    }),
  purge: (article: ManagedArticle) =>
    cms<void>(`admin/articles/${article.id}`, 'DELETE', { version: article.version }),
  restoreRevision: (article: ManagedArticle, version: number) =>
    cms<ManagedArticle>(`admin/articles/${article.id}/revisions/${version}/restore`, 'POST', {
      version: article.version,
    }),
};
