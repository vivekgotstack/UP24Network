'use client';

import { useMemo, useSyncExternalStore } from 'react';
export type SavedStory = {
  slug: string;
  title: string;
  category: string;
  publishedAt: string;
  savedAt?: string;
};
const KEY = 'up24.saved-stories.v1';
const EVENT = 'up24:saved-stories';
function snapshot() {
  try {
    return localStorage.getItem(KEY) ?? '[]';
  } catch {
    return '[]';
  }
}
function subscribe(notify: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) notify();
  };
  window.addEventListener('storage', storage);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener('storage', storage);
    window.removeEventListener(EVENT, notify);
  };
}
function parse(raw: string): SavedStory[] {
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((item): item is SavedStory =>
        Boolean(
          item &&
          typeof item === 'object' &&
          typeof item.slug === 'string' &&
          /^[\p{L}\p{N}\p{M}_-]{1,500}$/u.test(item.slug) &&
          typeof item.title === 'string' &&
          item.title.length <= 500 &&
          typeof item.category === 'string' &&
          typeof item.publishedAt === 'string' &&
          Number.isFinite(Date.parse(item.publishedAt)),
        ),
      )
      .slice(0, 50);
  } catch {
    return [];
  }
}
export function useSavedStories() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '[]');
  const stories = useMemo(() => parse(raw), [raw]);
  function toggle(story: SavedStory) {
    const current = parse(snapshot());
    const exists = current.some((item) => item.slug === story.slug);
    const next = exists
      ? current.filter((item) => item.slug !== story.slug)
      : [{ ...story, savedAt: new Date().toISOString() }, ...current].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }
  return { stories, toggle };
}
