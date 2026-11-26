export const brand = {
  name: 'TheMorningExpress',
  displayName: 'The Morning Express',
  logoPath: '/icons/morning-express-512.png',
  themeColor: '#071c36',
} as const;

export const appIcons = {
  favicon: '/icons/morning-express-48.png',
  touch: '/icons/morning-express-apple-touch.png',
  standard: '/icons/morning-express-192.png',
  large: '/icons/morning-express-512.png',
  maskable: '/icons/morning-express-maskable-512.png',
} as const;

export function isBrandPlaceholder(src: string) {
  return (
    src === brand.logoPath || src === '/brand/the-morning-express-logo.jpg' ||
    src === '/brand/up24-logo.png' || src === '/brand/newsroom-banner.png'
  );
}
