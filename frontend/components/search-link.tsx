import Link from 'next/link';
import { Search } from 'lucide-react';
export function SearchLink() {
  return (
    <Link href="/search" className="utility-button" aria-label="Search">
      <Search size={16} aria-hidden="true" />
      <span>Search</span>
    </Link>
  );
}
