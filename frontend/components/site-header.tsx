import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";

const sections = ["Uttar Pradesh", "India", "Business", "Education", "Culture"];

export function SiteHeader({ category = "" }: { category?: string }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="utility-bar">
        <span>UTTAR PRADESH / INDIA</span>
        <a href="/#watch">WATCH UP24</a>
      </div>
      <header className="masthead">
        <Image className="masthead-art" src="/brand/newsroom-banner.png" alt="Editorial illustration of Narendra Modi and Yogi Adityanath with Uttar Pradesh landmarks" fill preload sizes="100vw" />
        <div className="masthead-identity">
        <Link className="brand-lockup" href="/" aria-label="UP24Network home">
          <span className="brand-badge"><Image src="/brand/up24-logo.png" alt="" width={180} height={180} preload /></span>
          <span className="wordmark">UP<span>24</span><small>Network</small></span>
        </Link>
        <p className="masthead-tagline" lang="hi">खबर हमारी यकीन आपका</p>
        </div>
        <span className="banner-credit">Editorial illustration</span>
      </header>
      <nav className="section-nav" aria-label="News sections">
        <Link href="/" aria-current={!category ? "page" : undefined}>Top stories</Link>
        {sections.map((section) => (
          <Link key={section} href={`/?category=${encodeURIComponent(section)}#stories`}
            aria-current={category === section ? "page" : undefined}>{section}</Link>
        ))}
        <a className="watch-nav" href="/#watch"><Play size={12} aria-hidden="true" /> Watch</a>
      </nav>
      <div className="preview-notice"><span className="preview-dot" aria-hidden="true" />
        <strong>Preview edition</strong><span>Sample articles · Official channel below</span>
      </div>
    </>
  );
}
