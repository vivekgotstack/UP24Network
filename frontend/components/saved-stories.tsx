'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSavedStories } from '@/lib/saved-stories';
import { textLanguage } from '@/lib/language';
import { sectionTitle } from '@/lib/sections';

export function SavedStories() {
  const { stories, toggle } = useSavedStories();
  const [error, setError] = useState('');
  return (
    <section className="saved-stories">
      <div className="section-heading">
        <h2>Saved for later</h2>
        <span>{stories.length} / 50</span>
      </div>
      <p className="muted-note">
        Saved on this browser. Your reading list is available without signing in.
      </p>
      {!stories.length ? (
        <div className="saved-empty">
          <Bookmark size={28} aria-hidden="true" />
          <h3>Your next good read belongs here.</h3>
          <p>Use Save on any article to keep it in your reading list.</p>
          <Link className="text-link" href="/latest">
            Browse latest reports
          </Link>
        </div>
      ) : (
        <div className="saved-list">
          {stories.map((story) => (
            <article key={story.slug}>
              <div>
                <p className="eyebrow" lang="hi">
                  {sectionTitle(story.category)}
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
                    setError('Your browser could not update the reading list.');
                  }
                }}
              >
                Remove
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
