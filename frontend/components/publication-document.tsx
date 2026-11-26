import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { brand } from '@/lib/brand';
import { getPublicationChannels } from '@/lib/publication-channels';
import type { PublicationDocument as Document } from '@/lib/publication';
import {
  getPublicationPage,
  getPublicationNavigation,
  getPublicationSettings,
  publicationEdition,
} from '@/lib/publication-api';
import { copy, publicationLabel } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import { CookiePreferences } from '@/components/cookie-consent';
import { ReaderContactForm } from '@/components/reader-contact-form';

export async function PublicationDocument({
  document: initial,
  reference,
}: {
  document: Document;
  reference?: { title: string; url: string };
}) {
  const [persisted, publicationNavigation, locale, settings] = await Promise.all([
    getPublicationPage(initial.path),
    getPublicationNavigation(),
    getReaderLocale(),
    initial.path === '/complaints' ? getPublicationSettings() : undefined,
  ]);
  const officer = settings?.grievanceOfficerName?.trim();
  const grievanceEmail = settings?.grievanceEmail?.trim();
  const { document, contentLocale } = publicationEdition(initial, persisted, locale);
  const channels = initial.path === '/contact' ? getPublicationChannels() : [];
  const contactTopic =
    document.path === '/corrections'
      ? 'CORRECTION'
      : document.path === '/complaints'
        ? 'COMPLAINT'
        : document.path === '/privacy'
          ? 'PRIVACY'
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
          <Link href="/">{brand.name}</Link>
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
            {officer && grievanceEmail && (
              <section aria-labelledby="grievance-officer-heading">
                <h2 id="grievance-officer-heading">
                  {copy(locale, 'शिकायत अधिकारी', 'Grievance officer')}
                </h2>
                <p>{officer}</p>
                <p>
                  <a href={`mailto:${encodeURIComponent(grievanceEmail).replace('%40', '@')}`}>
                    {grievanceEmail}
                  </a>
                </p>
              </section>
            )}
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
                {channels.length > 0 && section.id === 'channels' && (
                  <div className="publication-channels">
                    {channels.map((social) => (
                      <a
                        key={social.name}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <strong>{social.name}</strong>
                        <span>
                          {brand.name}
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
            {showContactForm && (
              <ReaderContactForm topic={contactTopic} locale={locale} reference={reference} />
            )}
            <footer className="publication-note">
              <p>
                {copy(
                  locale,
                  'इस नीति या किसी रिपोर्ट के बारे में प्रश्न हो तो',
                  'For a question about this policy or a published report,',
                )}{' '}
                <Link href="/contact">
                  {copy(locale, 'TheMorningExpress से संपर्क करें', 'contact TheMorningExpress')}
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
