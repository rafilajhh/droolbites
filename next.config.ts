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
  },
  async redirects() {
    // The common guess for the reset flow; the real route is /reset-password.
    return [{ source: "/forgot-password", destination: "/reset-password", permanent: true }];
  },
  experimental: {
    // Above MAX_UPLOAD_BYTES (8 MB) plus form overhead, so an oversized photo
    // reaches saveProduct and gets the friendly "photoSize" error.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
