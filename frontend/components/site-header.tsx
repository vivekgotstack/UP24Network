import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { SectionMenu } from '@/components/section-menu';

const sections = ["Uttar Pradesh", "India", "Politics", "Business"];

export function SiteHeader({ category = "", latest = false }: { category?: string; latest?: boolean }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="utility-bar">
        <span>UTTAR PRADESH / INDIA</span>
        <div className="utility-account-links"><Link href="/account">My account</Link><Link href="/admin">Newsroom</Link></div>
      </div>
      <header className="masthead">
        <Image className="masthead-art" src="/brand/newsroom-banner-balanced.png" alt="Editorial collage of Narendra Modi, Yogi Adityanath, Rahul Gandhi, Akhilesh Yadav, Arvind Kejriwal, Lalu Prasad Yadav and Mayawati with Uttar Pradesh landmarks" fill preload sizes="100vw" />
        <div className="masthead-identity">
        <Link className="brand-lockup" href="/" aria-label="UP24Network home">
          <span className="brand-badge"><Image src="/brand/up24-logo.png" alt="" width={180} height={180} preload /></span>
        </Link>
        <p className="masthead-tagline" lang="hi">खबर हमारी यकीन आपका</p>
        </div>
        <span className="banner-credit">Editorial illustration</span>
      </header>
      <nav className="section-nav" aria-label="News sections">
        <Link href="/" aria-current={!category && !latest ? "page" : undefined}>Top stories</Link>
        <Link href="/?view=latest#stories" aria-current={latest ? "page" : undefined}>Latest</Link>
        {sections.map((section) => (
          <Link key={section} href={`/?category=${encodeURIComponent(section)}#stories`}
            aria-current={category === section ? "page" : undefined}>{section}</Link>
        ))}
        <SectionMenu />
        <a className="watch-nav" href="/#watch"><Play size={12} aria-hidden="true" /> Watch</a>
      </nav>
      <div className="preview-notice"><span className="preview-dot" aria-hidden="true" />
        <strong>Preview edition</strong><span>Sample articles · Official channel below</span>
      </div>
    </>
  );
}
