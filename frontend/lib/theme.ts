export const themePreferenceKey = 'up24.theme';
export const themePreferenceEvent = 'up24:theme-preference';
export const systemColourScheme = '(prefers-color-scheme: dark)';

export type ThemePreference = 'light' | 'dark' | 'system';

export function parseThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}
