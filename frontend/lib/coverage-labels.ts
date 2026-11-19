import { copy, type SiteLocale } from '@/lib/locale';

export function reportCount(locale: SiteLocale, count: number) {
  const number = new Intl.NumberFormat(copy(locale, 'hi-IN', 'en-IN')).format(count);
  return copy(locale, `${number} रिपोर्ट`, `${number} ${count === 1 ? 'report' : 'reports'}`);
}
