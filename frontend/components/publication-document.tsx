import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { brand } from '@/lib/brand';
import type { PublicationDocument as Document } from '@/lib/publication';
import {
  getPublicationPage,
  getPublicationNavigation,
  publicationEdition,
} from '@/lib/publication-api';
import { copy, publicationLabel } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import { CookiePreferences } from '@/components/cookie-consent';
import { ReaderContactForm } from '@/components/reader-contact-form';

export async function PublicationDocument({ document: initial }: { document: Document }) {
  const [persisted, publicationNavigation, locale] = await Promise.all([
    getPublicationPage(initial.path),
    getPublicationNavigation(),
    getReaderLocale(),
  ]);
  const { document, contentLocale } = publicationEdition(initial, persisted, locale);
  const contactTopic =
    document.path === '/corrections'
      ? 'CORRECTION'
      : document.path === '/complaints'
        ? 'COMPLAINT'
        : undefined;
  const showContactForm = document.path === '/contact' || Boolean(contactTopic);
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" className="publication-page" lang={locale}>
        <nav
          className="publication-breadcrumb"
          aria-label={copy(locale, 'पृष्ठ का रास्ता', 'Breadcrumb')}
        >
          <Link href="/">UP24Network</Link>
          <span aria-hidden="true">/</span>
          <span lang={contentLocale}>{document.label}</span>
        </nav>
        <header className="publication-heading">
          <h1 lang={contentLocale}>{document.title}</h1>
          <p className="publication-intro" lang={contentLocale}>
            {document.intro}
          </p>
          {persisted?.updatedAt && (
            <p className="publication-date">
              {copy(locale, 'अपडेट', 'Updated')}{' '}
              <time dateTime={persisted.updatedAt}>
                {new Intl.DateTimeFormat(`${locale}-IN`, {
                  dateStyle: 'long',
                  timeZone: 'Asia/Kolkata',
                }).format(new Date(persisted.updatedAt))}
              </time>
            </p>
          )}
        </header>
        <div className="publication-layout">
          <aside className="publication-sidebar">
            <nav aria-label={copy(locale, 'प्रकाशन की जानकारी', 'Publication information')}>
              <p className="eyebrow">
                {copy(locale, 'जानकारी और नीतियाँ', 'Information & policies')}
              </p>
              {publicationNavigation.map(({ path, label }) => (
                <Link
                  key={path}
                  href={path}
                  aria-current={path === document.path ? 'page' : undefined}
                >
                  {publicationLabel(locale, path, label)}
                </Link>
              ))}
            </nav>
            <nav
              className="publication-contents"
              aria-label={copy(locale, 'इस पृष्ठ पर', 'On this page')}
            >
              <p className="eyebrow">{copy(locale, 'इस पृष्ठ पर', 'On this page')}</p>
              {document.sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} lang={contentLocale}>
                  {section.title}
                </a>
              ))}
              {showContactForm && (
                <a href="#reader-contact">{copy(locale, 'संदेश भेजें', 'Send a message')}</a>
              )}
            </nav>
          </aside>
          <article className="publication-copy" aria-label={document.title}>
            {document.sections.map((section) => (
              <section
                id={section.id}
                key={section.id}
                aria-labelledby={`heading-${section.id}`}
                lang={contentLocale}
              >
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
                  <div className="publication-related">
                    <CookiePreferences>
                      {copy(locale, 'कुकी पसंद बदलें', 'Change cookie settings')}
                    </CookiePreferences>
                  </div>
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
                          UP24Network
                          <span className="sr-only">
                            {' '}
                            · {copy(locale, 'नए टैब में खुलेगा', 'Opens in a new tab')}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </section>
            ))}
            {(document.path === '/cookies' || document.path === '/privacy') && (
              <section aria-labelledby="instagram-media-heading">
                <h2 id="instagram-media-heading">
                  {copy(locale, 'Instagram रील्स', 'Instagram reels')}
                </h2>
                <p>
                  {copy(
                    locale,
                    'रील का लिंक खोलने पर आप Instagram पर जाते हैं। वहाँ Instagram की गोपनीयता नीति लागू होती है।',
                    'Reel links take you to Instagram, where Instagram’s privacy policy applies.',
                  )}
                </p>
              </section>
            )}
            {document.path === '/privacy' && (
              <section aria-labelledby="reader-view-counts-heading">
                <h2 id="reader-view-counts-heading">
                  {copy(locale, 'लेख कितनी बार खुले', 'Article view counts')}
                </h2>
                <p>
                  {copy(
                    locale,
                    'हम देखते हैं कि कौन-सी सार्वजनिक रिपोर्ट कितनी बार खुलती है। मौजूदा लॉगिन स्थिति से कर्मचारियों के व्यू अलग रखे जाते हैं। कुल संख्या में पाठक का नाम, खाता पहचान या पढ़ने का इतिहास नहीं होता।',
                    'We count public article views to understand which reports readers open. We use the current sign-in status to exclude staff views. The resulting totals contain no reader names, account identifiers, or browsing histories.',
                  )}
                </p>
              </section>
            )}
            {showContactForm && <ReaderContactForm topic={contactTopic} locale={locale} />}
            <footer className="publication-note">
              <p>
                {copy(
                  locale,
                  'इस नीति या किसी रिपोर्ट के बारे में प्रश्न हो तो',
                  'For a question about this policy or a published report,',
                )}{' '}
                <Link href="/contact">
                  {copy(locale, 'UP24Network से संपर्क करें', 'contact UP24Network')}
                </Link>
                {copy(locale, '।', '.')}
              </p>
            </footer>
          </article>
        </div>
      </main>
    </>
  );
}
