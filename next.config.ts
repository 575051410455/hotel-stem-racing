import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Docker image runs .next/standalone/server.js (see Dockerfile and docs/deploy.md).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
