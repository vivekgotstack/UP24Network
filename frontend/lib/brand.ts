export const appIcons = {
  standard: '/icons/morning-express-192.png',
  large: '/icons/morning-express-512.png',
} as const;

export const legacyBrandImages = [
  '/brand/the-morning-express-logo.jpg',
  '/brand/the-morning-express-masthead.png',
] as const;

export const brand = {
  name: 'TheMorningExpress',
  displayName: 'The Morning Express',
  logoPath: '/brand/the-morning-express-hindi.png',
  defaultTagline: 'खबर हमारी यकीन आपका',
  themeColor: '#071c36',
} as const;

export function isBrandPlaceholder(src: string) {
  return (
    src === brand.logoPath || src === appIcons.large || legacyBrandImages.some((path) => path === src) ||
    src === '/brand/up24-logo.png' || src === '/brand/newsroom-banner.png'
  );
}
