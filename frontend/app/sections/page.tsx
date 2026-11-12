import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { newsSections, sectionHref } from '@/lib/sections';
export const metadata: Metadata = { title: 'सभी विभाग', alternates: { canonical: '/sections' } };
export default function SectionsPage() {
  return (
    <>
      <SiteHeader compact />
      <main id="main-content">
        <header className="page-heading">
          <div>
            <p className="eyebrow">THE NEWSROOM DIRECTORY</p>
            <h1 lang="hi">खबरों की हर दिशा</h1>
            <p lang="hi">अपनी रुचि का विभाग चुनिए और उसकी पूरी कवरेज पढ़िए।</p>
          </div>
        </header>
        <nav className="section-page-grid" aria-label="All news sections">
          <Link href="/latest">
            <span className="eyebrow">LATEST</span>
            <h2 lang="hi">ताजा खबरें</h2>
            <p lang="hi">सबसे हाल में प्रकाशित सभी रिपोर्ट।</p>
          </Link>
          {newsSections.map((section) => (
            <Link key={section.slug} href={sectionHref(section.name)}>
              <span className="eyebrow">{section.name}</span>
              <h2 lang="hi">{section.title}</h2>
              <p lang="hi">{section.description}</p>
            </Link>
          ))}
        </nav>
      </main>
    </>
  );
}
