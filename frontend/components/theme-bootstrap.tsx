import 'server-only';
import { systemColourScheme, themePreferenceEvent, themePreferenceKey } from '@/lib/theme';

// Run in the document head before the first paint. The existing per-request CSP nonce authorizes this script.
const initializeTheme = `(() => {
  const key = ${JSON.stringify(themePreferenceKey)};
  const eventName = ${JSON.stringify(themePreferenceEvent)};
  const root = document.documentElement;
  const system = matchMedia(${JSON.stringify(systemColourScheme)});
  let preference = 'system';
  const apply = (value) => {
    preference = value === 'light' || value === 'dark' ? value : 'system';
    root.dataset.themePreference = preference;
    root.dataset.theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
  };
  try { apply(localStorage.getItem(key)); } catch { apply('system'); }
  system.addEventListener('change', () => apply(preference));
  addEventListener('storage', (event) => {
    if (event.storageArea === localStorage && (event.key === key || event.key === null)) apply(event.newValue);
  });
  addEventListener(eventName, (event) => apply(event.detail));
})();`;

export function ThemeBootstrap({ nonce }: { nonce?: string }) {
  return (
    <>
      <meta name="color-scheme" content="light dark" />
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: initializeTheme }} />
    </>
  );
}
