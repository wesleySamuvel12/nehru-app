import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@school-erp/types', '@school-erp/constants', '@school-erp/validation', '@school-erp/design-tokens', '@school-erp/api-client'],
};

export default nextConfig;
