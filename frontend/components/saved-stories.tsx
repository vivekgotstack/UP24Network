'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSavedStories } from '@/lib/saved-stories';
import { textLanguage } from '@/lib/language';
import { sectionTitle } from '@/lib/sections';
import { copy, type SiteLocale } from '@/lib/locale';

export function SavedStories({ locale }: { locale: SiteLocale }) {
  const { stories, toggle } = useSavedStories();
  const [error, setError] = useState('');
  return (
    <section className="saved-stories">
      <div className="section-heading">
        <h2>{copy(locale, 'सहेजी हुई खबरें', 'Saved for later')}</h2>
        <span>{stories.length} / 50</span>
      </div>
      <p className="muted-note">
        {copy(
          locale,
          'खबरें इसी ब्राउज़र में सहेजी जाती हैं। पढ़ने की सूची के लिए लॉगिन ज़रूरी नहीं है।',
          'Saved in this browser. Your reading list is available without signing in.',
        )}
      </p>
      {!stories.length ? (
        <div className="saved-empty">
          <Bookmark size={28} aria-hidden="true" />
          <h3>{copy(locale, 'अभी कोई खबर सहेजी नहीं है।', 'No saved stories yet.')}</h3>
          <p>
            {copy(
              locale,
              'किसी लेख पर सहेजें चुनकर उसे सूची में जोड़ें।',
              'Select Save on an article to add it to your list.',
            )}
          </p>
          <Link className="text-link" href="/latest">
            {copy(locale, 'ताज़ा खबरें', 'Latest news')}
          </Link>
        </div>
      ) : (
        <div className="saved-list">
          {stories.map((story) => (
            <article key={story.slug}>
              <div>
                <p className="eyebrow" lang={locale}>
                  {sectionTitle(story.category, locale)}
                </p>
                <h3 lang={textLanguage(story.title)}>
                  <Link href={`/news/${story.slug}`}>{story.title}</Link>
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  try {
                    toggle(story);
                  } catch {
                    setError(
                      copy(
                        locale,
                        'ब्राउज़र पढ़ने की सूची बदल नहीं सका।',
                        'Your browser could not update the reading list.',
                      ),
                    );
                  }
                }}
              >
                {copy(locale, 'हटाएँ', 'Remove')}
              </Button>
            </article>
          ))}
        </div>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
