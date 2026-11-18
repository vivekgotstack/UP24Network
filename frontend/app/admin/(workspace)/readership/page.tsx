import { ReadershipReport } from '@/components/newsroom/readership-report';

export const metadata = { title: 'Readership' };

export default function ReadershipPage() {
  const date = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date());
  const year = Number(date.find((part) => part.type === 'year')?.value);
  const month = Number(date.find((part) => part.type === 'month')?.value);

  return <ReadershipReport currentYear={year} currentMonth={month} />;
}
