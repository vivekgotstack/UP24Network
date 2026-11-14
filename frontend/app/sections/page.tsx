import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { newsSections, sectionGroups, sectionHref } from '@/lib/sections';
export const metadata: Metadata = { title: 'सभी विभाग', alternates: { canonical: '/sections' } };
export default function SectionsPage() {
  return (
    <>
      <SiteHeader compact />
      <main id="main-content">
        <header className="page-heading">
          <div>
            <p className="eyebrow">UP24NETWORK DIRECTORY</p>
            <h1 lang="hi">खबरों की हर दिशा</h1>
            <p lang="hi">अपनी रुचि का विभाग चुनिए और उसकी पूरी कवरेज पढ़िए।</p>
          </div>
        </header>
        <nav className="coverage-topics" aria-label="Quick links">
          <Link href="/latest">ताजा खबरें</Link>
          <Link href="/regions">राज्य और शहर</Link>
          <Link href="/watch">वीडियो रिपोर्ट</Link>
        </nav>
        {sectionGroups.map((group) => (
          <section className="directory-group" key={group.title}>
            <h2>{group.title}</h2>
            <nav className="section-page-grid" aria-label={group.title}>
              {newsSections
                .filter((section) => group.slugs.includes(section.slug))
                .map((section) => (
                  <Link key={section.slug} href={sectionHref(section.name)}>
                    <span className="eyebrow">{section.name}</span>
                    <h2 lang="hi">{section.title}</h2>
                    <p lang="hi">{section.description}</p>
                  </Link>
                ))}
            </nav>
          </section>
        ))}
      </main>
    </>
  );
}
