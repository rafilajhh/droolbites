import type { MetadataRoute } from "next";

const base = process.env.APP_URL ?? "http://localhost:3000";

/** The storefront is public; the admin, checkout, account and order pages are not for search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/checkout", "/account", "/orders", "/api", "/auth", "/newsletter", "/reset-password"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
