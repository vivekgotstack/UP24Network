export const brand = {
  name: 'TheMorningExpress',
  logoPath: '/brand/the-morning-express-logo.jpg',
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
  return src === brand.logoPath || src === '/brand/up24-logo.png' || src === '/brand/newsroom-banner.png';
}
