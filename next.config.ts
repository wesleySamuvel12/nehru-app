import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output = {
        ...config.output,
        chunkLoadTimeout: 300000, // 300 seconds (5 min) prevents ChunkLoadError on slow disk/compilation
      };
    }
    return config;
  },
};

export default nextConfig;
