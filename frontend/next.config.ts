import type { NextConfig } from 'next';
const config: NextConfig = {
  images: { remotePatterns: [
    { protocol: 'https', hostname: 'www.up24network.com', pathname: '/wp-content/uploads/**' },
    { protocol: 'https', hostname: 'up24network.com', pathname: '/wp-content/uploads/**' },
    { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' },
  ] },
};
export default config;
