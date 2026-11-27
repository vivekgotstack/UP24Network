import { brand } from '@/lib/brand';

export type SiteLocale = 'hi' | 'en';

export const LANGUAGE_COOKIE = 'UP24_LANGUAGE';
export const READER_LOCALE_HEADER = 'x-up24-reader-locale';

export function isSiteLocale(value: unknown): value is SiteLocale {
  return value === 'hi' || value === 'en';
}

export function copy<T>(locale: SiteLocale, hi: T, en: T): T {
  return locale === 'en' ? en : hi;
}

const publicationNames: Record<string, [english: string, hindi: string]> = {
  '/about': ['About', 'हमारे बारे में'],
  '/contact': ['Contact', 'संपर्क'],
  '/editorial-policy': ['Editorial standards', 'संपादकीय मानक'],
  '/corrections': ['Corrections', 'सुधार'],
  '/privacy': ['Privacy', 'गोपनीयता'],
  '/complaints': ['Complaints', 'शिकायतें'],
  '/ownership': ['Ownership', 'स्वामित्व'],
  '/advertising': ['Advertising', 'विज्ञापन'],
  '/terms': ['Terms of use', 'उपयोग की शर्तें'],
  '/cookies': ['Cookies', 'कुकीज़'],
};

/** Localize the built-in navigation labels and preserve publisher-written labels. */
export function publicationLabel(locale: SiteLocale, path: string, fallback: string) {
  const labels = publicationNames[path];
  return locale === 'hi' && labels?.[0] === fallback ? labels[1] : fallback;
}

export function publicationTagline(tagline: string) {
  // The masthead artwork already carries the default tagline.
  return tagline === brand.defaultTagline ? '' : tagline;
}
