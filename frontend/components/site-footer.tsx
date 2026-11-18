import { EditionArt } from '@/components/edition-art';
import { CookiePreferences } from '@/components/cookie-consent';
import { NewsletterSection } from '@/components/newsletter-section';
import Link from 'next/link';
import { brand } from '@/lib/brand';
import { newsSections, sectionGroups, sectionHref } from '@/lib/sections';
import { regions } from '@/lib/regions';
import { getPublicationSettings, getPublicationNavigation } from '@/lib/publication-api';

export async function SiteFooter() {
  const [settings, publicationNavigation] = await Promise.all([
    getPublicationSettings(),
    getPublicationNavigation(),
  ]);
  return (
    <footer className="site-footer" id="site-footer">
      <div className="footer-main">
        <EditionArt
          sizes="(max-width: 800px) 100vw, (max-width: 1100px) 65vw, 900px"
          tagline={settings.tagline}
        />
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
      {settings.footerDescription && (
        <p className="footer-description" lang="hi">
          {settings.footerDescription}
        </p>
      )}
      <NewsletterSection />
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
          <Link href="/archive">खबरों का संग्रह</Link>
          {publicationNavigation.map(({ path, label }) => (
            <Link key={path} href={path}>
              {label}
            </Link>
          ))}
        </nav>
        <a href="#top">Back to top</a>
        <CookiePreferences />
      </div>
    </footer>
  );
}
