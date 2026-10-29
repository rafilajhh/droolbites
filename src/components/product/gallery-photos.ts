import type { GalleryPhoto } from "@/components/shop/product-gallery";
import type { CutoutName } from "@/components/ui/snapshot";
import type { productMessages } from "@/i18n/messages/product";

type Alts = (typeof productMessages)["en"]["photos"];

/** Cookies with a cut-out, and the tint of the panel it sits on. */
const plates: Partial<Record<string, { cutout: CutoutName; tint: string }>> = {
  "chocolate-chunk": { cutout: "chocolate-chunk", tint: "bg-tint-mustard" },
  "double-chocolate": { cutout: "double-chocolate", tint: "bg-tint-lavender" },
  "red-velvet": { cutout: "red-velvet", tint: "bg-tint-lime" },
  "white-chocolate-almond": { cutout: "white-chocolate-almond", tint: "bg-tint-salmon" },
};

/**
 * The shop photo that shows each seeded product, keyed by slug so a product added later in
 * the admin never borrows another product's crop or description.
 */
const lifestyle: Partial<
  Record<string, { src: string; alt: "stack" | "partyBrownies" | "partyClassic" | "partyMatcha"; zoom?: GalleryPhoto["zoom"] }>
> = {
  "chocolate-chunk": { src: "/images/site/hero-cookies.png", alt: "stack" },
  "double-chocolate": { src: "/images/site/hero-cookies.png", alt: "stack" },
  "red-velvet": { src: "/images/site/hero-cookies.png", alt: "stack" },
  "white-chocolate-almond": { src: "/images/site/hero-cookies.png", alt: "stack" },
  "fudgy-brownies": { src: "/images/site/party-spread.png", alt: "partyBrownies", zoom: { scale: 1.8, origin: "0% 100%" } },
  "matcha-tiramisu": { src: "/images/site/party-spread.png", alt: "partyMatcha", zoom: { scale: 1.8, origin: "100% 83%" } },
  "classic-coffee-tiramisu": {
    src: "/images/site/party-spread.png",
    alt: "partyClassic",
    zoom: { scale: 1.8, origin: "100% 0%", position: "50% 0%" },
  },
};

/**
 * Product page gallery. The database holds one photo per product, so the others are a close
 * crop of it, the cookie cut-out on a tinted panel (cookies only) and at most one shop photo,
 * cropped to the part that shows this product. Crops assume the 680 × 640 main frame.
 */
export function galleryPhotos(
  item: { slug: string; name: string; imageUrl: string },
  alt: Alts,
): GalleryPhoto[] {
  const photos: GalleryPhoto[] = [
    { src: item.imageUrl, alt: alt.product(item.name) },
    { src: item.imageUrl, alt: alt.closeUp(item.name), zoom: { scale: 1.75, origin: "50% 55%" } },
  ];
  const plate = plates[item.slug];
  if (plate) {
    photos.push({ src: `/images/cutouts/${plate.cutout}.png`, alt: alt.plate(item.name), plate: plate.tint });
  }
  const shot = lifestyle[item.slug];
  if (shot) {
    photos.push({ src: shot.src, alt: alt[shot.alt], zoom: shot.zoom });
  }
  return photos;
}
