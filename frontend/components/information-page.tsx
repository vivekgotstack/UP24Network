import { SiteHeader } from '@/components/site-header';
import type { ReactNode } from 'react';
export function InformationPage({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader compact />
      <main id="main-content" className="information-page">
        <header className="page-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 lang="en">{title}</h1>
          </div>
        </header>
        <div className="information-body" lang="en">
          {children}
        </div>
      </main>
    </>
  );
}
