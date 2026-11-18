import Link from 'next/link';
import { Search } from 'lucide-react';
import { copy, type SiteLocale } from '@/lib/locale';

export function SearchLink({ locale = 'hi' }: { locale?: SiteLocale }) {
  const label = copy(locale, 'खोजें', 'Search');
  return (
    <Link href="/search" className="utility-button" aria-label={label}>
      <Search size={16} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
