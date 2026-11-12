import Link from 'next/link';
import { Menu } from 'lucide-react';
export function SectionMenu() {
  return (
    <Link href="/sections" className="section-menu-trigger">
      <Menu size={16} aria-hidden="true" />
      <span>All sections</span>
    </Link>
  );
}
