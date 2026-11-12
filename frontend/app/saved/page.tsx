import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SavedStories } from '@/components/saved-stories';
export const metadata: Metadata = {
  title: 'Saved stories',
  robots: { index: false, follow: false },
};
export default function SavedPage() {
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" className="saved-page">
        <header className="page-heading">
          <div>
            <p className="eyebrow">YOUR READING LIST</p>
            <h1 lang="hi">फुर्सत से पढ़िए</h1>
          </div>
        </header>
        <SavedStories />
      </main>
    </>
  );
}
