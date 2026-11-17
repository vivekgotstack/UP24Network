import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { StoryCard } from '@/components/story-card';
import { Pagination } from '@/components/pagination';
import type { ArticlePage } from '@/lib/articles';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'खबरों का संग्रह', description: 'महीने और वर्ष के अनुसार UP24Network की प्रकाशित रिपोर्ट।', alternates: { canonical: '/archive' } };
const months = ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'];
async function archive<T>(path: string): Promise<T> {
  const response = await fetch(`${process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080'}/api/articles/archive${path}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('The news archive is temporarily unavailable.');
  return response.json();
}
export default async function Archive({ searchParams }: { searchParams: Promise<{ year?: string; month?: string; page?: string }> }) {
  const params = await searchParams;
  const now = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', timeZone: 'Asia/Kolkata' }).formatToParts(new Date());
  const currentYear = Number(now.find((item) => item.type === 'year')!.value);
  const year = /^\d{4}$/.test(params.year ?? '') && Number(params.year) >= 1850 && Number(params.year) <= currentYear ? Number(params.year) : currentYear;
  const month = /^\d{1,2}$/.test(params.month ?? '') && Number(params.month) >= 1 && Number(params.month) <= 12 ? Number(params.month) : Number(now.find((item) => item.type === 'month')!.value);
  const page = /^\d{1,6}$/.test(params.page ?? '') ? Math.max(1, Math.min(100000, Number(params.page))) : 1;
  const [years, reports] = await Promise.all([archive<{ year: number; articles: number }[]>('/years'), archive<ArticlePage>(`?year=${year}&month=${month}&page=${page}&size=12`)]);
  const choices = years.some((item) => item.year === year) ? years : [{ year, articles: 0 }, ...years];
  return <><SiteHeader compact /><main id="main-content">
    <header className="page-heading" id="stories"><div><p className="eyebrow">UP24NETWORK / NEWS ARCHIVE</p><h1 lang="hi">खबरों का संग्रह</h1><p lang="hi">पुरानी रिपोर्ट, उनके मूल संदर्भ और प्रकाशन की तारीख के साथ।</p></div><span className="result-count">{reports.total} reports</span></header>
    <form action="/archive" className="archive-filter" lang="hi">
      <label>वर्ष<select name="year" defaultValue={year}>{choices.map((item) => <option key={item.year} value={item.year}>{item.year}</option>)}</select></label>
      <label>महीना<select name="month" defaultValue={month}>{months.map((name,index) => <option value={index + 1} key={name}>{name}</option>)}</select></label>
      <button type="submit">रिपोर्ट देखें</button>
    </form>
    {reports.total ? <div className="story-grid">{reports.items.map((article) => <StoryCard key={article.slug} article={article} />)}</div> : <section className="empty-state" lang="hi"><h2>{months[month - 1]} {year}</h2><p>इस महीने की कोई प्रकाशित रिपोर्ट संग्रह में नहीं है। दूसरा महीना चुनें।</p></section>}
    <Pagination page={reports.page} pages={reports.pages} base={`/archive?year=${year}&month=${month}`} />
  </main></>;
}
