'use client';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import styles from './error.module.css';

function ErrorCopy({ hindi, english }: { hindi: string; english: string }) {
  return (
    <>
      <span lang="hi" className={styles.hindi}>
        {hindi}
      </span>
      <span lang="en" className={styles.english}>
        {english}
      </span>
    </>
  );
}

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <>
      <header className="compact-header compact-header-minimal">
        <Link className="brand-lockup" href="/" aria-label="TheMorningExpress home">
          <span className="compact-logo">
          <BrandLogo />
          </span>
        </Link>
      </header>
      <main id="main-content" className="empty-state" role="alert">
        <h1>
          <ErrorCopy
            hindi="खबरें अभी खुल नहीं पा रही हैं।"
            english="Reports are temporarily unavailable."
          />
        </h1>
        <p>
          <ErrorCopy
            hindi="कुछ देर बाद फिर कोशिश करें। सहेजी गई खबरें इस ब्राउज़र में मौजूद हैं।"
            english="Try again in a moment. Your saved stories are still on this browser."
          />
        </p>
        <div className="empty-actions">
          <Button onClick={reset}>
            <ErrorCopy hindi="फिर कोशिश करें" english="Try again" />
          </Button>
          <a className="text-link" href="/saved">
            <ErrorCopy hindi="सहेजी गई खबरें" english="Saved stories" />
          </a>
        </div>
      </main>
    </>
  );
}
