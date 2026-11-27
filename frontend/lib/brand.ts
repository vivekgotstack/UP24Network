export const appIcons = {
  standard: '/icons/morning-express-192.png',
  large: '/icons/morning-express-512.png',
} as const;

export const legacyBrandImage = '/brand/the-morning-express-logo.jpg';

export const brand = {
  name: 'TheMorningExpress',
  displayName: 'The Morning Express',
  logoPath: '/brand/the-morning-express-masthead.png',
  defaultTagline: 'खबर हमारी यकीन आपका',
  themeColor: '#071c36',
} as const;

export function isBrandPlaceholder(src: string) {
  return (
    src === brand.logoPath || src === appIcons.large || src === legacyBrandImage ||
    src === '/brand/up24-logo.png' || src === '/brand/newsroom-banner.png'
  );
}
