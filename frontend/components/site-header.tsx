import Link from 'next/link';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { SectionMenu } from '@/components/section-menu';
import { SearchLink } from '@/components/search-link';
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
      <header className={`masthead ${compact ? 'masthead-compact' : ''}`}>
        <Image
          className="masthead-art"
          src="/brand/newsroom-banner-balanced.png"
          alt="Editorial illustration of government and opposition leaders with Uttar Pradesh landmarks"
          fill
          preload
          sizes="(max-width: 1320px) 100vw, 1280px"
        />
        <div className="masthead-identity">
          <Link className="brand-lockup" href="/" aria-label="UP24Network home">
            <span className="brand-badge">
              <Image src="/brand/up24-logo.png" alt="" width={180} height={180} preload />
            </span>
          </Link>
          <p className="masthead-tagline" lang="hi">
            खबर हमारी यकीन आपका
          </p>
        </div>
      </header>
      <nav className="section-nav" aria-label="News sections">
        <Link href="/" aria-current={home ? 'page' : undefined}>
          मुख्य पृष्ठ
        </Link>
        <Link href="/latest" aria-current={latest ? 'page' : undefined}>
          ताजा खबरें
        </Link>
        {['Uttar Pradesh', 'India', 'Politics', 'Sports'].map((section) => (
          <Link
            key={section}
            href={sectionHref(section)}
            lang="hi"
            aria-current={category === section ? 'page' : undefined}
          >
            {sectionTitle(section)}
          </Link>
        ))}
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
    </>
  );
}
