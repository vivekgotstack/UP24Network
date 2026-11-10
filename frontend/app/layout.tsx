import type { Metadata } from "next";
import Link from "next/link";
import Image from 'next/image';
import "./globals.css";
import { ReadingProgress } from "@/components/reading-progress";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "UP24Network | The voice of new India", template: "%s | UP24Network" },
  description: "A new perspective on Uttar Pradesh, India, and the stories closest to home.",
  applicationName: brand.name,
  publisher: brand.name,
  openGraph: { siteName: brand.name, locale: "en_IN", type: "website" },
  icons: { icon: "/brand/up24-logo.png", apple: "/brand/up24-logo.png" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ReadingProgress />
        <div className="site-shell">{children}
          <footer className="site-footer">
            <div><Link href="/" className="footer-logo brand-badge" aria-label="UP24Network home"><Image src="/brand/up24-logo.png" alt="" width={180} height={180} /></Link>
              <p lang="hi">खबर हमारी यकीन आपका</p></div>
            <nav className="social-links" aria-label="UP24Network social channels">
              <p>Follow UP24Network</p>
              <div>{brand.socials.map((social) => <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer"
                aria-label={`UP24Network on ${social.name} (opens in a new tab)`}>{social.name}</a>)}</div>
            </nav>
            <p>Uttar Pradesh. India. Beyond.<br />Development preview.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
