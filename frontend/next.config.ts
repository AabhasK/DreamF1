import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
