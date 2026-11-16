'use client';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <>
      <header className="compact-header compact-header-minimal">
        <Link className="brand-lockup" href="/" aria-label="UP24Network home">
          <span className="compact-logo"><BrandLogo eager /></span>
        </Link>
      </header>
      <main id="main-content" className="empty-state" role="alert">
        <p className="eyebrow">TEMPORARILY UNAVAILABLE</p>
        <h1 lang="hi">खबरें अभी खुल नहीं पा रही हैं।</h1>
        <p>Please try again in a moment. Your saved stories are still on this browser.</p>
        <div className="empty-actions">
          <Button onClick={reset}>Try again</Button>
          <a className="text-link" href="/saved">
            Open saved stories
          </a>
        </div>
      </main>
    </>
  );
}
