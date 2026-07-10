/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/about-me',
        destination: '/',
      },
      {
        source: '/IMM',
        destination: '/',
      },
      {
        source: '/3D',
        destination: '/',
      },
      {
        source: '/music',
        destination: '/',
      },
      {
        source: '/webdesign',
        destination: '/',
      }
    ];
  },
};

export default nextConfig;