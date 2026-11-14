import Link from 'next/link';
import { Play } from 'lucide-react';
import { SectionMenu } from '@/components/section-menu';
import { SearchLink } from '@/components/search-link';
import { BrandLogo } from '@/components/brand-logo';
import { sectionHref, sectionTitle } from '@/lib/sections';

export function SiteHeader({
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
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="utility-bar">
        <span>UTTAR PRADESH · INDIA</span>
        <div className="utility-account-links">
          <SearchLink />
          <Link href="/saved">Saved</Link>
          <Link href="/account">My account</Link>
        </div>
      </div>
      <header className={`compact-header ${compact ? 'compact-header-minimal' : ''}`}>
        <div className="compact-identity">
          <Link className="brand-lockup" href="/" aria-label="UP24Network home">
            <span className="compact-logo">
              <BrandLogo eager />
            </span>
          </Link>
          <p className="compact-tagline" lang="hi">
            खबर हमारी यकीन आपका
          </p>
        </div>
        <form action="/search" role="search" className="header-search">
          <label className="sr-only" htmlFor="header-query">
            Search UP24Network
          </label>
          <input
            id="header-query"
            name="q"
            type="search"
            placeholder="खबर, विषय या शहर"
            maxLength={120}
          />
          <button type="submit">खोजें</button>
        </form>
      </header>
      <nav className="section-nav" aria-label="News sections">
        <Link href="/" aria-current={home ? 'page' : undefined}>
          मुख्य पृष्ठ
        </Link>
        <Link href="/latest" aria-current={latest ? 'page' : undefined}>
          ताजा खबरें
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
            lang="hi"
            aria-current={category === section ? 'page' : undefined}
          >
            {sectionTitle(section)}
          </Link>
        ))}
        <Link href="/regions">राज्य और शहर</Link>
        <Link
          href="/watch"
          className="watch-nav"
          aria-current={category === 'Videos' ? 'page' : undefined}
        >
          <Play size={13} aria-hidden="true" />
          वीडियो
        </Link>
        <SectionMenu />
      </nav>
      <nav className="secondary-nav" aria-label="More news sections">
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
        ].map((section) => (
          <Link
            key={section}
            href={sectionHref(section)}
            aria-current={category === section ? 'page' : undefined}
          >
            {sectionTitle(section)}
          </Link>
        ))}
      </nav>
    </>
  );
}
