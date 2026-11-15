import 'server-only';
import { cache } from 'react';
import type { Metadata } from 'next';
import type { PublicationDocument } from '@/lib/publication';

export type PublicationSettings = {
  tagline: string;
  announcementEnabled: boolean;
  announcement: string;
  footerDescription: string;
  showRashifal: boolean;
  showVideo: boolean;
  version: number;
  updatedAt: string;
};
export type EditablePublicationDocument = PublicationDocument & { version: number; updatedAt: string };
const defaults: PublicationSettings = {
  tagline: 'खबर हमारी यकीन आपका', announcementEnabled: false, announcement: '',
  footerDescription: 'उत्तर प्रदेश, भारत और दुनिया की खबरें। स्थानीय सरोकार, स्पष्ट संदर्भ और जिम्मेदार पत्रकारिता।',
  showRashifal: true, showVideo: true, version: 0, updatedAt: '',
};
const endpoint = process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080';

async function publicRequest(path: string) {
  return fetch(`${endpoint}/api/publication/${path}`, {
    next: { revalidate: 60, tags: ['publication'] }, signal: AbortSignal.timeout(5000),
  });
}
export const getPublicationSettings = cache(async (): Promise<PublicationSettings> => {
  try {
    const response = await publicRequest('settings');
    if (response.ok) return response.json();
  } catch { /* The publication remains readable during a brief backend outage. */ }
  return defaults;
});
export const getPublicationPage = cache(async (path: string): Promise<EditablePublicationDocument | undefined> => {
  try {
    const response = await publicRequest(`pages/${encodeURIComponent(path.replace(/^\//, ''))}`);
    if (response.ok) return response.json();
  } catch { /* The supplied editorial copy is the initial fallback. */ }
  return undefined;
});
export async function publicationMetadata(fallback: PublicationDocument): Promise<Metadata> {
  const document = await getPublicationPage(fallback.path) ?? fallback;
  return { title: document.title, description: document.description, alternates: { canonical: document.path } };
}
