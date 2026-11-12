import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
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
