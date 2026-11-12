import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
export default function NotFound() {
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" className="empty-state">
        <p className="eyebrow">404 / PAGE NOT FOUND</p>
        <h1 lang="hi">यह पन्ना यहाँ नहीं है।</h1>
        <p>The report may have moved, or the address may be incorrect.</p>
        <div className="empty-actions">
          <Link className="text-link" href="/">
            Front page
          </Link>
          <Link className="text-link" href="/search">
            Search reports
          </Link>
        </div>
      </main>
    </>
  );
}
