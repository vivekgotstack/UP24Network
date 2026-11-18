'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AdminWorkspace } from '@/components/newsroom/admin-workspace';
import { Button } from '@/components/ui/button';
import { textLanguage } from '@/lib/language';
import { useNewsroomResource, useSession } from '@/lib/session';
import styles from './readership-report.module.css';

type ReadershipItem = {
  id: string;
  slug: string;
  title: string;
  monthViews: number;
  yearViews: number;
};
type ReadershipPage = {
  year: number;
  month: number;
  monthViews: number;
  yearViews: number;
  items: ReadershipItem[];
  hasNext: boolean;
};

const count = new Intl.NumberFormat('en-IN');
const monthFormat = new Intl.DateTimeFormat('en-IN', { month: 'long', timeZone: 'UTC' });
const months = Array.from({ length: 12 }, (_, index) =>
  monthFormat.format(new Date(Date.UTC(2000, index, 1))),
);

export function ReadershipReport({
  currentYear,
  currentMonth,
}: {
  currentYear: number;
  currentMonth: number;
}) {
  const account = useSession().data;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ year: currentYear, month: currentMonth, q: '' });
  const parameters = new URLSearchParams({
    year: String(filters.year),
    month: String(filters.month),
    page: String(page),
  });
  if (filters.q) parameters.set('q', filters.q);
  const report = useNewsroomResource<ReadershipPage>(
    account,
    `admin/readership?${parameters}`,
    account?.role === 'ADMIN' && account.newsroomAccess === true,
  );
  const data = report.data;

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = new FormData(event.currentTarget);
    setFilters({
      year: Number(input.get('year')),
      month: Number(input.get('month')),
      q: String(input.get('q')).trim(),
    });
    setPage(1);
  }

  return (
    <AdminWorkspace title="Readership" active="readership">
      <div className={styles.report}>
        <p className={styles.note}>
          Views count public article visits in India time. Signed-in administrators, editors and
          reporters are excluded.
        </p>

        <form className={styles.filters} onSubmit={apply} aria-label="Readership filters">
          <label>
            Month
            <select name="month" defaultValue={currentMonth}>
              {months.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Year
            <input
              name="year"
              type="number"
              defaultValue={currentYear}
              min={2000}
              max={currentYear}
              step={1}
              required
            />
          </label>
          <label className={styles.search}>
            Find an article
            <input name="q" type="search" placeholder="Title or slug" maxLength={200} />
          </label>
          <Button type="submit">Apply</Button>
          <Button
            type="button"
            variant="outline"
            disabled={report.isFetching}
            onClick={() => void report.refetch()}
          >
            Refresh
          </Button>
        </form>

        {report.error && (
          <p className="inline-error" role="alert">
            Reader views are temporarily unavailable. Try Refresh.
          </p>
        )}
        {report.isPending && <p role="status">Loading reader views…</p>}

        {data && (
          <>
            <dl className={styles.totals} aria-label="Site-wide views">
              <div>
                <dt>
                  Site views in {months[data.month - 1]} {data.year}
                </dt>
                <dd>{count.format(data.monthViews)}</dd>
              </div>
              <div>
                <dt>Site views in {data.year}</dt>
                <dd>{count.format(data.yearViews)}</dd>
              </div>
            </dl>

            <section aria-labelledby="article-view-counts">
              <h2 id="article-view-counts">Views by article</h2>
              {data.items.length ? (
                <ul className={styles.articles}>
                  {data.items.map((item) => (
                    <li className={styles.article} key={item.id}>
                      <Link href={`/admin/articles/${item.id}`} lang={textLanguage(item.title)}>
                        {item.title}
                      </Link>
                      <dl className={styles.articleCounts}>
                        <div>
                          <dt>{months[data.month - 1]}</dt>
                          <dd>{count.format(item.monthViews)}</dd>
                        </div>
                        <div>
                          <dt>{data.year}</dt>
                          <dd>{count.format(item.yearViews)}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.note}>No matching articles on this page.</p>
              )}
            </section>
          </>
        )}

        {(page > 1 || data?.hasNext) && (
          <nav className={styles.pagination} aria-label="Readership pages">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span>Page {page}</span>
            <Button variant="outline" disabled={!data?.hasNext} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </nav>
        )}
      </div>
    </AdminWorkspace>
  );
}
