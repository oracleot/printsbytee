import type { NextConfig } from "next";

// Product images are served from a public R2 bucket. We list it
// explicitly so Next.js's image optimizer can fetch and resize
// them. If you add a new R2 bucket, append its hostname here.
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pub-2b8e0c2c45a245e0920221478de2aed5.r2.dev" },
    ],
  },
};

export default nextConfig;