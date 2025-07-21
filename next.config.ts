import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
const basePath = isDev ? '/dev' : '';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true
  },
  basePath: basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  }
};

export default nextConfig;
