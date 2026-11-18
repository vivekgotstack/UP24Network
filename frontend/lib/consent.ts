'use client';

import { useSyncExternalStore } from 'react';

const POLICY_VERSION = 2;
type Choice = { version: typeof POLICY_VERSION; externalVideo: boolean; savedAt: number };
const KEY = 'UP24_CONSENT';
const EVENT = 'up24-consent-change';
const MAX_AGE = 180 * 86400;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;
let expiryTimer: ReturnType<typeof setInterval> | undefined;
let temporaryChoice = '';
function parse(raw: string): Choice | null {
  try {
    if (raw.length > 1024) return null;
    const value = JSON.parse(decodeURIComponent(raw));
    if (
      value.version === POLICY_VERSION &&
      typeof value.externalVideo === 'boolean' &&
      Number.isFinite(value.savedAt) &&
      value.savedAt <= Date.now() &&
      value.savedAt > Date.now() - MAX_AGE * 1000
    )
      return value;
  } catch {
    /* An absent/invalid preference grants no optional permission. */
  }
  return null;
}
function readCookie() {
  try {
    return (
      document.cookie
        .split('; ')
        .find((item) => item.startsWith(`${KEY}=`))
        ?.slice(KEY.length + 1) ?? ''
    );
  } catch {
    return '';
  }
}
function snapshot(): string {
  const raw = temporaryChoice || readCookie();
  return parse(raw) ? raw : '';
}
function notify() {
  listeners.forEach((listener) => listener());
}
function subscribe(callback: () => void) {
  listeners.add(callback);
  if (listeners.size === 1) {
    window.addEventListener('focus', notify);
    expiryTimer = setInterval(notify, 60000);
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(EVENT);
        channel.onmessage = (event: MessageEvent<unknown>) => {
          if (typeof event.data === 'string' && parse(event.data))
            temporaryChoice = readCookie() === event.data ? '' : event.data;
          notify();
        };
      }
    } catch {
      /* Browser privacy settings may disable cross-tab channels. */
    }
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) {
      window.removeEventListener('focus', notify);
      clearInterval(expiryTimer);
      channel?.close();
      channel = undefined;
    }
  };
}
export function saveConsent(externalVideo: boolean) {
  const value: Choice = { version: POLICY_VERSION, externalVideo, savedAt: Date.now() };
  const raw = encodeURIComponent(JSON.stringify(value));
  try {
    document.cookie = `${KEY}=${raw}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch {
    /* Keep an in-memory choice if this browser rejects all cookies. */
  }
  temporaryChoice = readCookie() === raw ? '' : raw;
  notify();
  try {
    channel?.postMessage(raw);
  } catch {
    /* Consent still takes effect in this tab if messaging is unavailable. */
  }
}
const serverSnapshot = () => '';
const readySnapshot = () => true;
const serverReadySnapshot = () => false;
const subscribeReady = () => () => {};
export function useConsent() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribeReady, readySnapshot, serverReadySnapshot);
  return { choice: parse(raw), ready };
}
