import Link from 'next/link';
import { Play } from 'lucide-react';
import { SectionMenu } from '@/components/section-menu';
import { SearchLink } from '@/components/search-link';
import { BrandLogo } from '@/components/brand-logo';
import { sectionHref, sectionTitle } from '@/lib/sections';
import { getPublicationSettings } from '@/lib/publication-api';
import { DashboardLink } from '@/components/dashboard-link';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { copy, publicationTagline } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import { textLanguage } from '@/lib/language';
import styles from './site-preferences.module.css';

export async function SiteHeader({
  category = '',
  latest = false,
  compact = false,
  home = false,
}: {
  category?: string;
  latest?: boolean;
  compact?: boolean;
  home?: boolean;
}) {
  const [settings, locale] = await Promise.all([getPublicationSettings(), getReaderLocale()]);
  const tagline = publicationTagline(locale, settings.tagline);
  return (
    <>
      <a className="skip-link" href="#main-content">
        {copy(locale, 'मुख्य सामग्री पर जाएँ', 'Skip to content')}
      </a>
      <div className={`utility-bar ${styles.utility}`}>
        <span className={styles.location}>{copy(locale, 'उत्तर प्रदेश · भारत', 'UTTAR PRADESH · INDIA')}</span>
        <div className={`utility-account-links ${styles.links}`}>
          <SearchLink locale={locale} />
          <Link href="/saved">{copy(locale, 'सहेजी गई खबरें', 'Saved')}</Link>
          <Link href="/account">{copy(locale, 'मेरा खाता', 'My account')}</Link>
          <DashboardLink locale={locale} />
          <div className={styles.preferences}>
            <LanguageSwitcher locale={locale} />
            <ThemeSwitcher locale={locale} />
          </div>
        </div>
      </div>
      <header className={`compact-header ${compact ? 'compact-header-minimal' : ''}`}>
        <div className="compact-identity">
          <Link className="brand-lockup" href="/" aria-label={copy(locale, 'UP24Network मुख्य पृष्ठ', 'UP24Network home')}>
            <span className="compact-logo">
              <BrandLogo eager />
            </span>
          </Link>
          <p className="compact-tagline" lang={textLanguage(tagline)}>
            {tagline}
          </p>
        </div>
        <form action="/search" role="search" className="header-search">
          <label className="sr-only" htmlFor="header-query">
            {copy(locale, 'UP24Network पर खोजें', 'Search UP24Network')}
          </label>
          <input
            id="header-query"
            name="q"
            type="search"
            placeholder={copy(locale, 'खबर, विषय या शहर', 'Story, topic or city')}
            maxLength={120}
          />
          <button type="submit">{copy(locale, 'खोजें', 'Search')}</button>
        </form>
      </header>
      <nav className="section-nav" aria-label={copy(locale, 'समाचार विभाग', 'News sections')}>
        <Link href="/" aria-current={home ? 'page' : undefined}>
          {copy(locale, 'मुख्य पृष्ठ', 'Home')}
        </Link>
        <Link href="/latest" aria-current={latest ? 'page' : undefined}>
          {copy(locale, 'ताज़ा खबरें', 'Latest news')}
        </Link>
        {[
          'Uttar Pradesh',
          'India',
          'World',
          'Politics',
          'Cricket',
          'Entertainment',
          'Business',
          'Technology',
        ].map((section) => (
          <Link
            key={section}
            href={sectionHref(section)}
            lang={locale}
            aria-current={category === section ? 'page' : undefined}
          >
            {sectionTitle(section, locale)}
          </Link>
        ))}
        <Link href="/regions">{copy(locale, 'राज्य और शहर', 'States and cities')}</Link>
        {settings.showVideo && (
          <Link
            href="/watch"
            className="watch-nav"
            aria-current={category === 'Videos' ? 'page' : undefined}
          >
            <Play size={13} aria-hidden="true" />
            {copy(locale, 'वीडियो', 'Videos')}
          </Link>
        )}
        <SectionMenu locale={locale} />
      </nav>
      <nav className="secondary-nav" aria-label={copy(locale, 'अन्य समाचार विभाग', 'More news sections')}>
        {[
          'Education',
          'Jobs',
          'Agriculture',
          'Health & Wellness',
          'Religion',
          'Rashifal',
          'Lifestyle',
          'Auto',
          'Explainers',
        ]
          .filter((section) => settings.showRashifal || section !== 'Rashifal')
          .map((section) => (
            <Link
              key={section}
              href={sectionHref(section)}
              aria-current={category === section ? 'page' : undefined}
            >
              {sectionTitle(section, locale)}
            </Link>
          ))}
      </nav>
      {settings.announcementEnabled && settings.announcement && (
        <aside className="site-announcement" aria-label={copy(locale, 'प्रकाशक की सूचना', 'Publication announcement')}>
          <p lang={textLanguage(settings.announcement)}>{settings.announcement}</p>
        </aside>
      )}
    </>
  );
}
