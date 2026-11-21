import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { isSiteLocale, LANGUAGE_COOKIE, READER_LOCALE_HEADER, type SiteLocale } from '@/lib/locale';

export const getReaderLocale = cache(async (): Promise<SiteLocale> => {
  const requested = (await headers()).get(READER_LOCALE_HEADER);
  if (isSiteLocale(requested)) return requested;
  return (await cookies()).get(LANGUAGE_COOKIE)?.value === 'en' ? 'en' : 'hi';
});
