'use client';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <>
      <SiteHeader compact />
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
