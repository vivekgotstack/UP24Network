import 'server-only';
import { cache } from 'react';
import type { Metadata } from 'next';
import type { PublicationDocument } from '@/lib/publication';
import { publicationNavigation } from '@/lib/publication';
import { hindiPublication } from '@/lib/publication-hi';
import type { SiteLocale } from '@/lib/locale';
import { getReaderLocale } from '@/lib/reader-locale';
import { brand } from '@/lib/brand';

export type PublicationSettings = {
  tagline: string;
  announcementEnabled: boolean;
  announcement: string;
  footerDescription: string;
  showRashifal: boolean;
  showVideo: boolean;
  showCricketScores: boolean;
  grievanceOfficerName?: string | null;
  grievanceEmail?: string | null;
  version: number;
  updatedAt: string;
};
export type EditablePublicationDocument = PublicationDocument & {
  version: number;
  updatedAt: string;
};
const defaults: PublicationSettings = {
  tagline: brand.defaultTagline,
  announcementEnabled: false,
  announcement: '',
  footerDescription:
    'उत्तर प्रदेश, भारत और दुनिया की खबरें। स्थानीय सरोकार, स्पष्ट संदर्भ और जिम्मेदार पत्रकारिता।',
  showRashifal: true,
  showVideo: true,
  showCricketScores: true,
  version: 0,
  updatedAt: '',
};
const endpoint = process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080';

async function publicRequest(path: string) {
  return fetch(`${endpoint}/api/publication/${path}`, {
    next: { revalidate: 60, tags: ['publication'] },
    signal: AbortSignal.timeout(5000),
  });
}
export const getPublicationSettings = cache(async (): Promise<PublicationSettings> => {
  try {
    const response = await publicRequest('settings');
    if (response.ok) return response.json();
  } catch {
    /* The publication remains readable during a brief backend outage. */
  }
  return defaults;
});
export const getPublicationPage = cache(
  async (path: string): Promise<EditablePublicationDocument | undefined> => {
    try {
      const response = await publicRequest(`pages/${encodeURIComponent(path.replace(/^\//, ''))}`);
      if (response.ok) return response.json();
    } catch {
      /* The supplied editorial copy is the initial fallback. */
    }
    return undefined;
  },
);
export const getPublicationNavigation = cache(
  async (): Promise<{ path: string; label: string }[]> => {
    try {
      const response = await publicRequest('navigation');
      if (response.ok) return response.json();
    } catch {
      /* Use the established public routes when the backend is unavailable. */
    }
    return publicationNavigation;
  },
);
export const getNewsletterAvailability = cache(async (): Promise<boolean> => {
  try {
    const response = await publicRequest('newsletter');
    if (response.ok) return (await response.json()).available === true;
  } catch {
    // Unavailable signup must stay separate from reading the publication.
  }
  return false;
});
export async function publicationMetadata(fallback: PublicationDocument): Promise<Metadata> {
  const [persisted, locale] = await Promise.all([
    getPublicationPage(fallback.path),
    getReaderLocale(),
  ]);
  const { document } = publicationEdition(fallback, persisted, locale);
  return {
    title: document.title,
    description: document.description,
    alternates: { canonical: document.path },
  };
}

export function publicationEdition(
  fallback: PublicationDocument,
  persisted: EditablePublicationDocument | undefined,
  locale: SiteLocale,
) {
  if (locale === 'hi' && (!persisted || persisted.version === 0)) {
    const translated = hindiPublication(fallback);
    if (translated) return { document: translated, contentLocale: 'hi' as const };
  }
  return { document: persisted ?? fallback, contentLocale: 'en' as const };
}
