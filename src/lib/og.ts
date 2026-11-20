import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";

/**
 * Link previews (Open Graph). The images are small 1200×630 JPGs made by scripts/og-images.mjs, since
 * WhatsApp and friends drop previews much over 300 KB; the site photos themselves stay full size.
 */
const size = { width: 1200, height: 630 };

/** Shared by every page. A segment that sets `openGraph` replaces the whole block, so it spreads this in. */
export function siteOpenGraph(locale: Locale): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    siteName: "Droolbites",
    locale: locale === "id" ? "id_ID" : "en_US",
    images: [{ url: "/images/og/droolbites.jpg", ...size, alt: "Droolbites" }],
  };
}

/** A product photo's preview copy; a photo uploaded in the admin has none and is shared as uploaded. */
export function productOgImage(imageUrl: string, alt: string) {
  const seeded = /^\/images\/products\/([a-z0-9-]+)\.png$/.exec(imageUrl);
  return seeded ? { url: `/images/og/products/${seeded[1]}.jpg`, ...size, alt } : { url: imageUrl, alt };
}
