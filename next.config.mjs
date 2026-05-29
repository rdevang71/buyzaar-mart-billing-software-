/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || '';
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

    if (!backendUrl || !isProduction) return [];

    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${backendUrl.replace(/\/$/, '')}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
