'use client';

import { useSyncExternalStore } from 'react';

type Choice = { version: 1; externalVideo: boolean; savedAt: number };
const KEY = 'UP24_CONSENT';
const EVENT = 'up24-consent-change';
const MAX_AGE = 180 * 86400;
function snapshot(): string {
  return document.cookie.split('; ').find((item) => item.startsWith(`${KEY}=`))?.slice(KEY.length + 1) ?? '';
}
function parse(raw: string): Choice | null {
  try {
    const value = JSON.parse(decodeURIComponent(raw));
    if (value.version === 1 && typeof value.externalVideo === 'boolean' && Number.isFinite(value.savedAt)
      && value.savedAt <= Date.now() && value.savedAt > Date.now() - MAX_AGE * 1000) return value;
  } catch { /* An absent/invalid preference grants no optional permission. */ }
  return null;
}
function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener('focus', callback);
  const channel = typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel(EVENT);
  if (channel) channel.onmessage = callback;
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener('focus', callback); channel?.close(); };
}
export function saveConsent(externalVideo: boolean) {
  const value: Choice = { version: 1, externalVideo, savedAt: Date.now() };
  document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  window.dispatchEvent(new Event(EVENT));
  if (typeof BroadcastChannel !== 'undefined') { const channel = new BroadcastChannel(EVENT); channel.postMessage('changed'); channel.close(); }
}
export function useConsent() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '');
  const ready = useSyncExternalStore(() => () => {}, () => true, () => false);
  return { choice: parse(raw), ready };
}
