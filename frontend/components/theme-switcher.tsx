'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useRef, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
  parseThemePreference,
  systemColourScheme,
  themePreferenceEvent,
  themePreferenceKey,
  type ThemePreference,
} from '@/lib/theme';
import styles from './theme-switcher.module.css';

const options = [
  { value: 'light', hi: 'हल्का', en: 'Light', Icon: Sun },
  { value: 'dark', hi: 'गहरा', en: 'Dark', Icon: Moon },
  { value: 'system', hi: 'डिवाइस के अनुसार', en: 'System', Icon: Monitor },
] as const;

function subscribe(notify: () => void) {
  window.addEventListener(themePreferenceEvent, notify);
  window.addEventListener('storage', notify);
  return () => {
    window.removeEventListener(themePreferenceEvent, notify);
    window.removeEventListener('storage', notify);
  };
}

function snapshot() {
  return parseThemePreference(document.documentElement.dataset.themePreference);
}

const serverSnapshot = (): ThemePreference => 'system';

function applyTheme(preference: ThemePreference, resolved: 'dark' | 'light') {
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  try {
    localStorage.setItem(themePreferenceKey, preference);
  } catch {
    // The preference still applies in the current tab when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(themePreferenceEvent, { detail: preference }));
}

function changeTheme(preference: ThemePreference, trigger: HTMLElement | null) {
  const root = document.documentElement;
  const resolved =
    preference === 'system'
      ? matchMedia(systemColourScheme).matches
        ? 'dark'
        : 'light'
      : preference;
  const update = () => applyTheme(preference, resolved);
  if (
    root.dataset.theme === resolved ||
    typeof document.startViewTransition !== 'function' ||
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    root.hasAttribute('data-theme-reveal')
  ) {
    update();
    return;
  }

  const bounds = trigger?.getBoundingClientRect();
  const x = bounds ? bounds.left + bounds.width / 2 : innerWidth / 2;
  const y = bounds ? bounds.top + bounds.height / 2 : 0;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.style.setProperty('--theme-reveal-x', `${x}px`);
  root.style.setProperty('--theme-reveal-y', `${y}px`);
  root.style.setProperty('--theme-reveal-radius', `${radius}px`);
  root.setAttribute('data-theme-reveal', '');
  const transition = document.startViewTransition(update);
  const cleanup = () => root.removeAttribute('data-theme-reveal');
  void transition.finished.then(cleanup, cleanup);
}

export function ThemeSwitcher({ locale = 'hi' }: { locale?: 'hi' | 'en' }) {
  const preference = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === preference) ?? options[2];
  const SelectedIcon = selected.Icon;
  const label = locale === 'en' ? 'Appearance' : 'दिखावट';
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          ref={trigger}
          type="button"
          variant="ghost"
          size="icon"
          className={styles.trigger}
          aria-label={`${label} · ${selected[locale]}`}
          title={label}
        >
          <SelectedIcon aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.menu}
          align="end"
          sideOffset={6}
          collisionPadding={12}
        >
          <DropdownMenu.Label className={styles.label}>{label}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={preference}
            onValueChange={(value) => changeTheme(parseThemePreference(value), trigger.current)}
          >
            {options.map(({ value, Icon, ...copy }) => (
              <DropdownMenu.RadioItem key={value} value={value} className={styles.item}>
                <Icon size={17} aria-hidden="true" />
                <span>{copy[locale]}</span>
                <DropdownMenu.ItemIndicator className={styles.indicator}>
                  <Check size={16} aria-hidden="true" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
