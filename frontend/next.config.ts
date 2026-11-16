import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: `${process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080'}/media/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  images: {
    maximumDiskCacheSize: 256 * 1024 * 1024,
    maximumResponseBody: 5 * 1024 * 1024,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'www.up24network.com', pathname: '/wp-content/uploads/**' },
      { protocol: 'https', hostname: 'up24network.com', pathname: '/wp-content/uploads/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' },
      ...['i1.ytimg.com', 'i2.ytimg.com', 'i3.ytimg.com', 'i4.ytimg.com'].map((hostname) => ({
        protocol: 'https' as const,
        hostname,
        pathname: '/vi/**',
      })),
    ],
  },
};
export default config;
