'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { textLanguage } from '@/lib/language';
import type { Account } from '@/lib/cms';
import type { ManagedArticle } from '@/components/newsroom/types';

export function ArticleWorkspace({
  user,
  articles,
  busy,
  refreshing,
  onRefresh,
  onPublish,
}: {
  user: Account;
  articles: ManagedArticle[];
  busy: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<unknown>;
  onPublish: (row: ManagedArticle, published: boolean, breaking: boolean) => Promise<boolean>;
}) {
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('ALL');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const rows = articles.filter(
    (row) =>
      (filter === 'ALL' || row.status === filter) &&
      `${row.article.title} ${row.article.category} ${row.article.city}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / 15));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * 15, currentPage * 15);
  const canPublish = user.role === 'ADMIN' || user.role === 'EDITOR';
  return (
    <section>
      <div className="cms-section-heading">
        <div>
          <p className="eyebrow">EDITORIAL WORKSPACE</p>
          <h2>All reports</h2>
        </div>
        <div className="cms-row-actions">
          <Button variant="outline" disabled={busy || refreshing} onClick={() => void onRefresh()}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button asChild>
            <Link href="/admin/articles/new">
              <Plus size={15} aria-hidden="true" />
              New article
            </Link>
          </Button>
        </div>
      </div>
      <div className="desk-filters">
        <label className="desk-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Find an article</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Find a headline, section or city"
          />
        </label>
        <label>
          <span className="sr-only">Publication status</span>
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All articles</option>
            <option value="DRAFT">Drafts</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>
      </div>
      <p className="desk-count" role="status">
        {rows.length} {rows.length === 1 ? 'article' : 'articles'}
        {user.role === 'REPORTER' ? ' assigned to you' : ''}
      </p>
      {rows.length ? (
        <div className="cms-article-list">
          {visibleRows.map((row) => (
            <article key={row.id}>
              <div className="cms-badges">
                <span data-status={row.status}>{row.status}</span>
                <span>{row.article.category}</span>
                {row.article.breaking && <span>Breaking</span>}
              </div>
              <h3 lang={textLanguage(row.article.title)}>{row.article.title}</h3>
              <p>
                {row.article.author}
                {row.manualOverride ? ' · Editorial control' : ' · Imported'}
              </p>
              <div className="cms-row-actions">
                {!(user.role === 'REPORTER' && row.status !== 'DRAFT') && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/articles/${row.id}`}>Edit report</Link>
                  </Button>
                )}
                <Link href={`/admin/articles/${row.id}/preview`}>Preview</Link>
                {row.status === 'PUBLISHED' && (
                  <Link
                    href={`/news/${row.article.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View public report
                  </Link>
                )}
                {canPublish && (
                  <>
                    <Button
                      size="sm"
                      variant={row.status === 'PUBLISHED' ? 'outline' : 'default'}
                      disabled={busy}
                      onClick={() => setConfirm(row.id)}
                    >
                      {row.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <label className="cms-toggle">
                      <input
                        type="checkbox"
                        checked={row.article.breaking}
                        disabled={busy || row.status !== 'PUBLISHED'}
                        onChange={(event) => void onPublish(row, true, event.target.checked)}
                      />
                      Breaking news
                    </label>
                  </>
                )}
              </div>
              {confirm === row.id && (
                <section className="inline-confirm" aria-label="Confirm publication change">
                  <p>
                    {row.status === 'PUBLISHED'
                      ? 'Return this report to drafts and remove it from public pages?'
                      : 'Publish this saved report on the public website?'}
                  </p>
                  <div className="cms-row-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => setConfirm(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={async () => {
                        if (await onPublish(row, row.status !== 'PUBLISHED', row.article.breaking))
                          setConfirm(null);
                      }}
                    >
                      {busy
                        ? 'Updating…'
                        : row.status === 'PUBLISHED'
                          ? 'Confirm unpublish'
                          : 'Confirm publication'}
                    </Button>
                  </div>
                </section>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="desk-empty">
          <FileText size={30} aria-hidden="true" />
          <h3>{articles.length ? 'No matching articles.' : 'Your next report starts here.'}</h3>
          <p>
            {articles.length
              ? 'Change the search or status filter.'
              : 'Create a draft to start the publishing workflow.'}
          </p>
        </div>
      )}
      {pageCount > 1 && (
        <nav className="pagination" aria-label="Article desk pages">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </Button>
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </section>
  );
}
