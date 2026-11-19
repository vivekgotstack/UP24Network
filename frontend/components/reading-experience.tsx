'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Bookmark, Share2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSavedStories, type SavedStory } from '@/lib/saved-stories';
import { copy, type SiteLocale } from '@/lib/locale';

export function ReadingExperience({ story, children, locale = 'hi' }: { story: SavedStory; children: ReactNode; locale?: SiteLocale }) {
  const [scale, setScale] = useState(1);
  const [notice, setNotice] = useState('');
  const { stories, toggle } = useSavedStories();
  const saved = stories.some((item) => item.slug === story.slug);
  async function share() {
    const data = { title: story.title, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        setNotice(copy(locale, 'खबर का लिंक कॉपी हो गया।', 'Article link copied.'));
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError'))
        setNotice(copy(locale, `खबर का लिंक कॉपी करें। ${data.url}`, `Copy the article link. ${data.url}`));
    }
  }
  return (
    <div className="reading-experience" style={{ '--reading-scale': scale } as CSSProperties}>
      <div className="reading-toolbar" aria-label={copy(locale, 'पढ़ने के विकल्प', 'Article reading tools')}>
        <div className="reading-size">
          <Button
            variant="ghost"
            size="sm"
            aria-label={copy(locale, 'अक्षर छोटे करें', 'Smaller text')}
            disabled={scale <= 0.9}
            onClick={() => setScale((s) => Math.max(0.9, s - 0.1))}
          >
            A−
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={copy(locale, 'अक्षर बड़े करें', 'Larger text')}
            disabled={scale >= 1.3}
            onClick={() => setScale((s) => Math.min(1.3, s + 0.1))}
          >
            A+
          </Button>
        </div>
        <div className="reading-actions">
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={saved}
            onClick={() => {
              try {
                toggle(story);
                setNotice(saved ? copy(locale, 'खबर सूची से हटा दी गई।', 'Removed from your reading list.') : copy(locale, 'खबर सहेज ली गई।', 'Saved on this browser.'));
              } catch {
                setNotice(copy(locale, 'खबर सहेजी नहीं जा सकी।', 'Your browser could not save this article.'));
              }
            }}
          >
            <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
            {saved ? copy(locale, 'सहेजी गई', 'Saved') : copy(locale, 'सहेजें', 'Save')}
          </Button>
          <Button variant="ghost" size="sm" onClick={share}>
            <Share2 size={15} aria-hidden="true" />
            {copy(locale, 'साझा करें', 'Share')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer size={15} aria-hidden="true" />
            <span className="print-label">{copy(locale, 'छापें', 'Print')}</span>
          </Button>
        </div>
      </div>
      {notice && (
        <p className="reader-notice" role="status">
          {notice}
        </p>
      )}
      <div className="article-body">{children}</div>
    </div>
  );
}
