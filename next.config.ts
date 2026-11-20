import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the database or the cart/session cookies, so the classic
  // dynamic rendering model is simpler than Cache Components here.

  // The Docker image builds a self-contained server (see Dockerfile).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // "Jangan dikompres": photos are served at full quality.
    qualities: [100],
    // Google profile photos (users.avatar_url, checked in src/lib/google-account.ts).
    remotePatterns: [{ protocol: "https", hostname: "*.googleusercontent.com", port: "", pathname: "/**", search: "" }],
  },
  // No "X-Powered-By: Next.js" on every response.
  poweredByHeader: false,
  async redirects() {
    // The common guess for the reset flow; the real route is /reset-password.
    return [{ source: "/forgot-password", destination: "/reset-password", permanent: true }];
  },
  async headers() {
    // The browser features the site may use: geolocation for "Use my location" on the delivery map,
    // nothing else. nginx in production also sends nosniff and the referrer policy (same values).
    // No Content-Security-Policy yet: a strict one needs per-request nonces for Next's inline scripts.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), browsing-topics=()" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  experimental: {
    // Above MAX_UPLOAD_BYTES (8 MB) plus form overhead, so an oversized photo
    // reaches saveProduct and gets the friendly "photoSize" error.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
