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

  // M6 LOW-1: Security headers applied to all routes.
  // CSP is intentionally omitted here (deferred for incremental rollout).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HSTS: only in production. Vercel serves HTTPS by default.
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;