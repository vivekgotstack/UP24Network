import { EditionArt } from '@/components/edition-art';
import Link from 'next/link';
import { brand } from '@/lib/brand';
import { newsSections, sectionGroups, sectionHref } from '@/lib/sections';
import { regions } from '@/lib/regions';
import { publicationNavigation } from '@/lib/publication';

export function SiteFooter() {
  return (
    <footer className="site-footer" id="site-footer">
      <div className="footer-main">
        <EditionArt />
        <nav className="social-links" aria-label="Official UP24Network channels">
          <h2 className="footer-social-heading" lang="hi">
            आधिकारिक चैनल
          </h2>
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
