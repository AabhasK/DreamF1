import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  // demo-data/ is read with fs at runtime (lib/demo.ts), which the bundler can't see —
  // ship it with every server route so the snapshots exist inside the Vercel functions.
  outputFileTracingIncludes: {
    "/*": ["./demo-data/**/*"],
  },
};

export default nextConfig;
