import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { brand } from '@/lib/brand';
import type { PublicationDocument as Document } from '@/lib/publication';
import { getPublicationPage, getPublicationNavigation } from '@/lib/publication-api';
import { CookiePreferences } from '@/components/cookie-consent';

export async function PublicationDocument({ document: initial }: { document: Document }) {
  const [persisted, publicationNavigation] = await Promise.all([
    getPublicationPage(initial.path),
    getPublicationNavigation(),
  ]);
  const document = persisted ?? initial;
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" className="publication-page" lang="en">
        <nav className="publication-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">UP24Network</Link>
          <span aria-hidden="true">/</span>
          <span>{document.label}</span>
        </nav>
        <header className="publication-heading">
          <p className="eyebrow">THE PUBLICATION</p>
          <h1>{document.title}</h1>
          <p className="publication-intro">{document.intro}</p>
          {persisted?.updatedAt && (
            <p className="publication-date">
              Updated{' '}
              <time dateTime={persisted.updatedAt}>
                {new Intl.DateTimeFormat('en-IN', {
                  dateStyle: 'long',
                  timeZone: 'Asia/Kolkata',
                }).format(new Date(persisted.updatedAt))}
              </time>
            </p>
          )}
        </header>
        <div className="publication-layout">
          <aside className="publication-sidebar">
            <nav aria-label="Publication information">
              <p className="eyebrow">INFORMATION & POLICIES</p>
              {publicationNavigation.map(({ path, label }) => (
                <Link
                  key={path}
                  href={path}
                  aria-current={path === document.path ? 'page' : undefined}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <nav className="publication-contents" aria-label="On this page">
              <p className="eyebrow">ON THIS PAGE</p>
              {document.sections.map((section) => (
                <a key={section.id} href={`#${section.id}`}>
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>
          <article className="publication-copy" aria-label={document.title}>
            {document.sections.map((section) => (
              <section id={section.id} key={section.id} aria-labelledby={`heading-${section.id}`}>
                <h2 id={`heading-${section.id}`}>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.points && (
                  <ul>
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                )}
                {section.links && (
                  <div className="publication-related">
                    {section.links.map((link) => (
                      <Link href={link.href} key={link.href}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
                {document.path === '/cookies' && section.id === 'choice' && (
                  <div className="publication-related"><CookiePreferences>अपनी कुकी पसंद बदलें</CookiePreferences></div>
                )}
                {document.path === '/contact' && section.id === 'channels' && (
                  <div className="publication-channels">
                    {brand.socials.map((social) => (
                      <a
                        key={social.name}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <strong>{social.name}</strong>
                        <span>
                          UP24Network<span className="sr-only"> · Opens in a new tab</span>
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </section>
            ))}
            <footer className="publication-note">
              <p>
                For a question about this policy or a published report,{' '}
                <Link href="/contact">contact UP24Network</Link>.
              </p>
            </footer>
          </article>
        </div>
      </main>
    </>
  );
}
