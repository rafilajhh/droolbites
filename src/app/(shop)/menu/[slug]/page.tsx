import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AccordionItem } from "@/components/ui/accordion";
import { ArrowLink } from "@/components/ui/button";
import { galleryPhotos } from "@/components/product/gallery-photos";
import { ProductReviews } from "@/components/product/product-reviews";
import { formatRating, productRatings } from "@/components/product/reviews";
import { MenuItemCard } from "@/components/shop/menu-item-card";
import { ProductBuy } from "@/components/shop/product-buy";
import { ProductGallery } from "@/components/shop/product-gallery";
import { toShopCategories, toShopProduct } from "@/components/shop/shop-product";
import {
  isTrayCategory,
  localized,
  PRODUCT_PLACEHOLDER_IMAGE,
  productContent,
  productLong,
} from "@/content/products";
import { getLocale, getMessages } from "@/i18n/server";
import { menuMessages } from "@/i18n/messages/menu";
import { notFoundMessages } from "@/i18n/messages/pages/not-found";
import { productMessages } from "@/i18n/messages/product";
import { getMenu, getProductBySlug } from "@/lib/catalog";
import { formatRupiah } from "@/lib/format";
import { productOgImage, siteOpenGraph } from "@/lib/og";
import { getStoreSettings } from "@/lib/settings";

/** "You may also like" fills whole rows: four columns at lg, two below. */
const RELATED_COLUMNS = { lg: 4, base: 2 };

async function loadProduct(slug: string) {
  const product = await getProductBySlug(slug);
  return product?.isAvailable ? product : null;
}

export async function generateMetadata({ params }: PageProps<"/menu/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [product, locale] = await Promise.all([loadProduct(slug), getLocale()]);
  // An unknown or hidden product renders the 404 body, so it gets the 404 title too.
  if (!product) {
    const nf = await getMessages(notFoundMessages);
    return { title: nf.metaTitle, description: nf.metaDescription, robots: { index: false } };
  }
  return {
    title: product.name,
    description: productLong(product.slug, product.description, locale),
    alternates: { canonical: `/menu/${product.slug}` },
    openGraph: product.imageUrl
      ? { ...siteOpenGraph(locale), images: [productOgImage(product.imageUrl, product.name)] }
      : undefined,
  };
}

/** pen: Product detail (w7mQL). */
export default async function ProductPage({ params }: PageProps<"/menu/[slug]">) {
  const { slug } = await params;
  const [product, locale, t, m, menu, settings] = await Promise.all([
    loadProduct(slug),
    getLocale(),
    getMessages(productMessages),
    getMessages(menuMessages),
    getMenu(),
    getStoreSettings(),
  ]);
  if (!product) notFound();

  const item = toShopProduct(product, locale);
  const content = productContent[product.slug];
  const multi = item.variants.length > 1;
  const single = item.variants[0]?.name;
  const unit = multi
    ? isTrayCategory(product.category.slug)
      ? m.unit.tray
      : ""
    : single === "1 piece"
      ? m.unit.piece
      : single === "1 portion"
        ? m.unit.portion
        : "";
  // Same category first, then the rest of the menu.
  const others = toShopCategories(menu, locale)
    .flatMap((c) => c.products)
    .filter((p) => p.slug !== item.slug);
  const ranked = [
    ...others.filter((p) => p.categorySlug === item.categorySlug),
    ...others.filter((p) => p.categorySlug !== item.categorySlug),
  ];
  // One full row at lg (which is also two full rows below lg), else one full row below lg; fewer than two hides it.
  const relatedCount =
    ranked.length >= RELATED_COLUMNS.lg ? RELATED_COLUMNS.lg : ranked.length >= RELATED_COLUMNS.base ? RELATED_COLUMNS.base : 0;
  const related = ranked.slice(0, relatedCount);

  // Products added in the admin have no copy here yet; their sections simply don't show.
  const sections: { title: string; body?: string }[] = [
    { title: t.ingredients, body: localized(content?.ingredients, locale) },
    { title: t.allergens, body: localized(content?.allergens, locale) },
    { title: t.storage, body: localized(content?.storage, locale) },
  ];
  const details = sections.filter((d): d is { title: string; body: string } => Boolean(d.body));

  // A product without a photo shows the placeholder once, not crops of the logo.
  const photos = galleryPhotos(item, t.photos).slice(0, item.imageUrl === PRODUCT_PLACEHOLDER_IMAGE ? 1 : undefined);
  const rating = productRatings[product.slug];

  return (
    <div className="flex w-full flex-col">
      <nav aria-label={t.breadcrumb} className="w-full px-4 py-5 sm:px-8 lg:px-16 lg:py-6">
        <ol className="flex flex-wrap items-center gap-2.5 text-sm leading-[21px] font-medium">
          <li>
            <Link href="/menu" className="relative after:absolute after:-inset-x-1.5 after:-inset-y-3 after:content-[''] text-muted-foreground hover:text-foreground">
              {t.menu}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </li>
          <li>
            <Link href={`/menu?category=${item.categorySlug}`} className="relative after:absolute after:-inset-x-1.5 after:-inset-y-3 after:content-[''] text-muted-foreground hover:text-foreground">
              {item.categoryName}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </li>
          <li>
            <span aria-current="page" className="font-bold text-foreground">
              {item.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="flex w-full flex-col gap-10 px-4 pt-2 sm:px-8 lg:flex-row lg:gap-12 lg:px-16 xl:gap-[72px]">
        {/* The gallery takes a share of the row, so the buy column keeps room for the title and size tiles at 1024.
            On a phone on its side (under 480px tall) it is held to about two thirds of the screen's height and
            centred, so the name and price come up in the second screen instead of after one and a half. */}
        <div className="lg:sticky lg:top-24 lg:w-[46%] lg:shrink-0 lg:self-start xl:w-[52%] xl:max-w-[680px] [@media(max-height:480px)]:mx-auto [@media(max-height:480px)]:w-full [@media(max-height:480px)]:max-w-[70dvh]">
          <ProductGallery photos={photos} badge={item.badge} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-7 lg:pt-6">
          <ProductBuy
            product={item}
            eyebrow={item.categoryName.toUpperCase()}
            description={productLong(product.slug, product.description, locale)}
            unit={unit}
            rating={rating ? { value: formatRating(rating.value, locale), count: rating.count } : undefined}
            deliveryFee={settings.deliveryEnabled ? formatRupiah(settings.deliveryFee) : null}
            pickup={settings.pickupEnabled}
          />
          {details.length ? (
            <div className="flex w-full flex-col">
              {details.map((d, i) => (
                <AccordionItem
                  key={d.title}
                  question={d.title}
                  defaultOpen={i === 0}
                  openStyle="minus"
                  questionClassName="text-[20px]! leading-[25px]!"
                  className="[&>summary>span:last-child]:bg-oat! [&>summary>span:last-child]:text-foreground!"
                >
                  {d.body}
                </AccordionItem>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Reviews and related products: one section-y around them, one section gap between them. */}
      <div className="section-y flex w-full flex-col gap-12 lg:gap-20">
        <ProductReviews slug={product.slug} />

        {related.length ? (
          <section aria-labelledby="also-like" className="flex w-full flex-col gap-8 px-4 sm:px-8 lg:px-16">
            <div className="flex w-full flex-wrap items-end justify-between gap-4">
              <h2 id="also-like" className="type-section font-display text-balance font-bold text-foreground">
                {t.alsoLike}
              </h2>
              <ArrowLink href="/menu">{t.viewMenu}</ArrowLink>
            </div>
            <div className="grid w-full grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-6">
              {related.map((p) => (
                <MenuItemCard key={p.id} product={p} size="sm" showBadge={false} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
      {/* Below lg: room for the pinned buy bar, which hides once this spacer scrolls in, so it never covers the footer. */}
      <div data-buy-bar-end aria-hidden className="h-[calc(5rem+env(safe-area-inset-bottom))] lg:hidden" />
    </div>
  );
}
