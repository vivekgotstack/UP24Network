import { EditionArt } from '@/components/edition-art';
import { CookiePreferences } from '@/components/cookie-consent';
import { NewsletterSection } from '@/components/newsletter-section';
import { SocialIcon } from '@/components/social-icon';
import Link from 'next/link';
import { brand } from '@/lib/brand';
import { newsSections, sectionGroups, sectionHref } from '@/lib/sections';
import { regions, regionTitle } from '@/lib/regions';
import { getPublicationSettings, getPublicationNavigation } from '@/lib/publication-api';
import { copy, publicationLabel, publicationTagline } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import { textLanguage } from '@/lib/language';
import { readerFeeds } from '@/lib/reader-feeds';

const defaultFooterDescription = 'उत्तर प्रदेश, भारत और दुनिया की खबरें। स्थानीय सरोकार, स्पष्ट संदर्भ और जिम्मेदार पत्रकारिता।';
const yearInIndia = new Intl.DateTimeFormat('en-IN', { year: 'numeric', timeZone: 'Asia/Kolkata' });

export async function SiteFooter() {
  const [settings, publicationNavigation, locale] = await Promise.all([
    getPublicationSettings(),
    getPublicationNavigation(),
    getReaderLocale(),
  ]);
  const officialChannelsLabel = copy(locale, 'आधिकारिक चैनल', 'Official channels');
  const footerDescription = settings.footerDescription === defaultFooterDescription
    ? copy(locale, defaultFooterDescription, 'News from Uttar Pradesh, India, and the world. Local stories, clear context, and responsible journalism.')
    : settings.footerDescription;
  return (
    <footer className="site-footer" id="site-footer">
      <div className="footer-main">
        <EditionArt
          sizes="(max-width: 800px) 100vw, (max-width: 1100px) 65vw, 900px"
          tagline={publicationTagline(locale, settings.tagline)}
          locale={locale}
        />
        <nav className="social-links" aria-label={officialChannelsLabel}>
          <h2 className="footer-social-heading">
            {officialChannelsLabel}
          </h2>
          {brand.socials.map((social) => (
            <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer">
              <SocialIcon name={social.name} />
              {social.name}
              <span className="sr-only"> {copy(locale, '(नए टैब में खुलेगा)', '(opens in a new tab)')}</span>
            </a>
          ))}
        </nav>
      </div>
      {footerDescription && (
        <p className="footer-description" lang={textLanguage(footerDescription)}>
          {footerDescription}
        </p>
      )}
      <NewsletterSection locale={locale} />
      <div className="footer-directory">
        {sectionGroups.map((group) => (
          <nav key={group.title} aria-label={copy(locale, group.title, group.englishTitle)}>
            <h2>{copy(locale, group.title, group.englishTitle)}</h2>
            {newsSections
              .filter((section) => group.slugs.includes(section.slug))
              .map((section) => (
                <Link key={section.slug} href={sectionHref(section.name)}>
                  {copy(locale, section.title, section.name)}
                </Link>
              ))}
          </nav>
        ))}
        <nav aria-label={copy(locale, 'राज्य', 'States')}>
          <h2>
            <Link href="/regions">{copy(locale, 'राज्य और शहर', 'States and cities')}</Link>
          </h2>
          {regions.map((region) => (
            <Link key={region.slug} href={`/region/${region.slug}`}>
              {regionTitle(region, locale)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="footer-bottom">
        <p>© {yearInIndia.format(new Date())} UP24Network</p>
        <nav aria-label={copy(locale, 'प्रकाशन की जानकारी', 'Publication information')}>
          <Link href="/archive">{copy(locale, 'खबरों का संग्रह', 'News archive')}</Link>
          <a href={readerFeeds.hi.url} lang="hi">हिंदी RSS</a>
          <a href={readerFeeds.en.url} lang="en">English RSS</a>
          {publicationNavigation.map(({ path, label }) => (
            <Link key={path} href={path}>
              {publicationLabel(locale, path, label)}
            </Link>
          ))}
        </nav>
        <a href="#top">{copy(locale, 'ऊपर जाएँ', 'Back to top')}</a>
        <CookiePreferences />
      </div>
    </footer>
  );
}
