import { BrandLogo } from '@/components/brand-logo';
import Link from 'next/link';
import { brand } from '@/lib/brand';
import { newsSections, sectionGroups, sectionHref } from '@/lib/sections';
import { regions } from '@/lib/regions';
import { publicationNavigation } from '@/lib/publication';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-identity">
          <Link href="/" className="brand-badge footer-logo" aria-label="UP24Network home">
            <BrandLogo />
          </Link>
          <p lang="hi">
            खबर हमारी
            <br />
            यकीन आपका
          </p>
        </div>
        <nav className="footer-sections" aria-label="Explore news">
          {['india', 'uttar-pradesh', 'sports', 'business', 'entertainment', 'technology']
            .map((slug) => newsSections.find((section) => section.slug === slug)!)
            .map((section) => (
              <Link key={section.slug} href={sectionHref(section.name)} lang="hi">
                {section.title}
              </Link>
            ))}
        </nav>
        <nav className="social-links" aria-label="Official UP24Network channels">
          <p className="eyebrow">OUR CHANNELS</p>
          {brand.socials.map((social) => (
            <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer">
              {social.name}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </nav>
      </div>
      <div className="footer-directory">
        {sectionGroups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2>{group.title}</h2>
            {newsSections
              .filter((section) => group.slugs.includes(section.slug))
              .map((section) => (
                <Link key={section.slug} href={sectionHref(section.name)}>
                  {section.title}
                </Link>
              ))}
          </nav>
        ))}
        <nav aria-label="States">
          <h2>
            <Link href="/regions">राज्य और शहर</Link>
          </h2>
          {regions.map((region) => (
            <Link key={region.slug} href={`/region/${region.slug}`}>
              {region.title}
            </Link>
          ))}
        </nav>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} UP24Network</p>
        <nav aria-label="Publication information">
          {publicationNavigation.map(({ path, label }) => (
            <Link key={path} href={path}>
              {label}
            </Link>
          ))}
        </nav>
        <a href="#top">Back to top</a>
      </div>
    </footer>
  );
}
