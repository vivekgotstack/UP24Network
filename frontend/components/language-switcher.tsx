'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { copy, LANGUAGE_COOKIE, type SiteLocale } from '@/lib/locale';
import styles from './site-preferences.module.css';

export function LanguageSwitcher({ locale }: { locale: SiteLocale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(language: SiteLocale) {
    if (language === locale || pending) return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', language);
      window.location.replace(url.href);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className={styles.languages} role="group" aria-label={copy(locale, 'वेबसाइट की भाषा', 'Site language')} aria-busy={pending}>
      <button type="button" lang="hi" aria-pressed={locale === 'hi'} disabled={pending} onClick={() => switchTo('hi')}>
        हिंदी
      </button>
      <button type="button" lang="en" aria-pressed={locale === 'en'} disabled={pending} onClick={() => switchTo('en')}>
        English
      </button>
    </div>
  );
}
