import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Match the reference site's URL style: category URLs end with "/",
  // detail pages end with ".html" (file-like URLs never get a slash appended).
  trailingSlash: true,
  // ...but don't force-redirect: /cart, /checkout and the JSON endpoints
  // (/api/v2/..., /search/post/autocomplete) are served without a slash, as on the reference site.
  skipTrailingSlashRedirect: true,
  // Admin forms upload images through Server Actions (default limit is 1MB).
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'; upgrade-insecure-requests",
          },
        ],
      },
    ];
  },
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
