import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canonicalReelUrl } from '@/lib/instagram';
import { copy, type SiteLocale } from '@/lib/locale';
import styles from './trending-reels.module.css';

export function InstagramReel({
  url,
  title,
  locale = 'hi',
}: {
  url: string;
  title: string;
  locale?: SiteLocale;
}) {
  const source = canonicalReelUrl(url);
  if (!source) return null;
  const label = copy(locale, 'Instagram पर रील देखें', 'Watch on Instagram');
  return (
    <div className={styles.viewer}>
      <Button asChild variant="outline">
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} — ${title}`}
        >
          {label}
          <ExternalLink aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
}
