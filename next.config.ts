import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Docker image runs .next/standalone/server.js (see Dockerfile and docs/deploy.md).
  output: "standalone",
  cacheComponents: true,
  experimental: {
    // One bilingual 404 page (src/app/global-not-found.tsx) for every address no page answers.
    // A page that calls notFound() while prerendering is stored as an empty shell under Cache
    // Components, so its 404 only appeared once JavaScript ran.
    globalNotFound: true,
  },
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
