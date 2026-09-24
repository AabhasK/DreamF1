import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  // demo-data/ is read with fs at runtime (lib/demo.ts), which the bundler can't see —
  // ship it with the routes that read it so the snapshots exist inside the Vercel functions.
  // Listed explicitly: a catch-all "/*" key breaks Turbopack's standalone (Docker) build.
  outputFileTracingIncludes: Object.fromEntries(
    ["/api/[...path]", "/dashboard", "/telemetry", "/predict", "/compare"].map((r) => [r, ["./demo-data/**/*"]]),
  ),
};

export default nextConfig;
