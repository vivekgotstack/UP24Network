import { cms } from '@/lib/cms';
import type { ManagedArticle, SaveArticle } from '@/lib/newsroom/types';

/** Editorial transport adapter. Components depend on commands, not HTTP details. */
export const articleDesk = {
  find: (id: string) => cms<ManagedArticle>(`admin/articles/${id}`),
  save: (id: string | undefined, input: SaveArticle) =>
    cms<ManagedArticle>(id ? `admin/articles/${id}` : 'admin/articles', id ? 'PUT' : 'POST', input),
  publish: (article: ManagedArticle, published: boolean, breaking: boolean) =>
    cms<ManagedArticle>(`admin/articles/${article.id}/publication`, 'POST', {
      version: article.version,
      published,
      breaking,
    }),
};
