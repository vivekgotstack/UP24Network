import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { StoryCard } from '@/components/story-card';
import { Pagination } from '@/components/pagination';
import type { ArticlePage } from '@/lib/articles';
import { reportCount } from '@/lib/coverage-labels';
import { copy } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getReaderLocale();
  return {
    title: copy(locale, 'खबरों का संग्रह', 'News archive'),
    description: copy(
      locale,
      'महीने और वर्ष के अनुसार UP24Network की प्रकाशित रिपोर्ट।',
      'Browse past UP24Network reports by month and year.',
    ),
    alternates: { canonical: '/archive' },
  };
}
async function archive<T>(path: string): Promise<T> {
  const response = await fetch(
    `${process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080'}/api/articles/archive${path}`,
    { cache: 'no-store', signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok) throw new Error('The news archive is temporarily unavailable.');
  return response.json();
}
export default async function Archive({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; page?: string }>;
}) {
  const [params, locale] = await Promise.all([searchParams, getReaderLocale()]);
  const now = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).formatToParts(new Date());
  const currentYear = Number(now.find((item) => item.type === 'year')!.value);
  const year =
    /^\d{4}$/.test(params.year ?? '') &&
    Number(params.year) >= 1850 &&
    Number(params.year) <= currentYear
      ? Number(params.year)
      : currentYear;
  const month =
    /^\d{1,2}$/.test(params.month ?? '') && Number(params.month) >= 1 && Number(params.month) <= 12
      ? Number(params.month)
      : Number(now.find((item) => item.type === 'month')!.value);
  const page = /^\d{1,6}$/.test(params.page ?? '')
    ? Math.max(1, Math.min(100000, Number(params.page)))
    : 1;
  const [years, reports] = await Promise.all([
    archive<{ year: number; articles: number }[]>('/years'),
    archive<ArticlePage>(`?year=${year}&month=${month}&page=${page}&size=12`),
  ]);
  const choices = years.some((item) => item.year === year)
    ? years
    : [{ year, articles: 0 }, ...years];
  const monthFormat = new Intl.DateTimeFormat(copy(locale, 'hi-IN', 'en-IN'), {
    month: 'long',
    timeZone: 'UTC',
  });
  const months = Array.from({ length: 12 }, (_, index) =>
    monthFormat.format(new Date(Date.UTC(year, index, 1))),
  );
  return (
    <>
      <SiteHeader compact />
      <main id="main-content">
        <header className="page-heading" id="stories">
          <div>
            <h1>{copy(locale, 'खबरों का संग्रह', 'News archive')}</h1>
            <p>
              {copy(
                locale,
                'पुरानी रिपोर्ट, उनके मूल संदर्भ और प्रकाशन की तारीख के साथ।',
                'Past reports with their original context and publication dates.',
              )}
            </p>
          </div>
          <span className="result-count">{reportCount(locale, reports.total)}</span>
        </header>
        <form action="/archive" className="archive-filter">
          <label>
            {copy(locale, 'वर्ष', 'Year')}
            <select name="year" defaultValue={year}>
              {choices.map((item) => (
                <option key={item.year} value={item.year}>
                  {item.year}
                </option>
              ))}
            </select>
          </label>
          <label>
            {copy(locale, 'महीना', 'Month')}
            <select name="month" defaultValue={month}>
              {months.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">{copy(locale, 'रिपोर्ट देखें', 'View reports')}</button>
        </form>
        {reports.total ? (
          <div className="story-grid">
            {reports.items.map((article) => (
              <StoryCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <section className="empty-state">
            <h2>
              {months[month - 1]} {year}
            </h2>
            <p>
              {copy(
                locale,
                'इस महीने की कोई रिपोर्ट नहीं है। दूसरा महीना चुनें।',
                'No reports were published this month. Choose another month.',
              )}
            </p>
          </section>
        )}
        <Pagination
          page={reports.page}
          pages={reports.pages}
          base={`/archive?year=${year}&month=${month}`}
        />
      </main>
    </>
  );
}
