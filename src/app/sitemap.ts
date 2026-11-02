import type { MetadataRoute } from "next";
import { getMenu } from "@/lib/catalog";

const base = process.env.APP_URL ?? "http://localhost:3000";

/** The storefront pages plus every product on the menu. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["/", "/menu", "/our-story", "/location", "/faq", "/careers", "/shipping-policy", "/returns-refunds", "/privacy-policy"];
  const menu = await getMenu().catch(() => []);
  const products = menu.flatMap((c) => c.products.map((p) => `/menu/${p.slug}`));
  return [...pages, ...products].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/" || path === "/menu" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/menu") ? 0.8 : 0.5,
  }));
}

// Products change from the admin, so the list is built per request.
export const dynamic = "force-dynamic";
