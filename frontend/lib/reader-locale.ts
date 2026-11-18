import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { LANGUAGE_COOKIE, type SiteLocale } from '@/lib/locale';

export const getReaderLocale = cache(async (): Promise<SiteLocale> => {
  return (await cookies()).get(LANGUAGE_COOKIE)?.value === 'en' ? 'en' : 'hi';
});
