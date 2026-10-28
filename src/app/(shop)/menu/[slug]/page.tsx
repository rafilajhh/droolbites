import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AccordionItem } from "@/components/ui/accordion";
import { ArrowLink } from "@/components/ui/button";
import { MenuItemCard } from "@/components/shop/menu-item-card";
import { ProductBuy } from "@/components/shop/product-buy";
import { ProductGallery } from "@/components/shop/product-gallery";
import { toShopCategories, toShopProduct } from "@/components/shop/shop-product";
import { localized, productContent, productLong } from "@/content/products";
import { getLocale, getMessages } from "@/i18n/server";
import { menuMessages } from "@/i18n/messages/menu";
import { productMessages } from "@/i18n/messages/product";
import { getMenu, getProductBySlug } from "@/lib/catalog";

const MAX_RELATED = 4;

async function loadProduct(slug: string) {
  const product = await getProductBySlug(slug);
  return product?.isAvailable ? product : null;
}

export async function generateMetadata({ params }: PageProps<"/menu/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [product, locale] = await Promise.all([loadProduct(slug), getLocale()]);
  if (!product) return {};
  return {
    title: product.name,
    description: productLong(product.slug, product.description, locale),
    openGraph: product.imageUrl ? { images: [product.imageUrl] } : undefined,
  };
}

/** pen: Product detail (w7mQL). */
export default async function ProductPage({ params }: PageProps<"/menu/[slug]">) {
  const { slug } = await params;
  const [product, locale, t, m, menu] = await Promise.all([
    loadProduct(slug),
    getLocale(),
    getMessages(productMessages),
    getMessages(menuMessages),
    getMenu(),
  ]);
  if (!product) notFound();

  const item = toShopProduct(product, locale);
  const content = productContent[product.slug];
  const multi = item.variants.length > 1;
  const single = item.variants[0]?.name;
  const unit = multi
    ? product.category.slug === "brownies"
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
  const related = [
    ...others.filter((p) => p.categorySlug === item.categorySlug),
    ...others.filter((p) => p.categorySlug !== item.categorySlug),
  ].slice(0, MAX_RELATED);

  const details: { title: string; body?: string }[] = [
    { title: t.ingredients, body: localized(content?.ingredients, locale) },
    { title: t.allergens, body: localized(content?.allergens, locale) },
    { title: t.storage, body: localized(content?.storage, locale) },
  ].filter((d) => d.body);

  // The database has one photo per product; the pen's other three are general shop photos, described as such.
  const photos = [
    { src: item.imageUrl, alt: t.photos.product(item.name) },
    { src: "/images/site/hero-cookies.png", alt: t.photos.stack },
    { src: "/images/site/gift-box.png", alt: t.photos.gift },
    { src: "/images/site/party-spread.png", alt: t.photos.party },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col">
      <nav aria-label={t.breadcrumb} className="w-full px-4 py-5 sm:px-8 lg:px-16 lg:py-6">
        <ol className="flex flex-wrap items-center gap-2.5 text-sm leading-[21px] font-medium">
          <li>
            <Link href="/menu" className="text-muted-foreground hover:text-foreground">
              {t.menu}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </li>
          <li>
            <Link href={`/menu?category=${item.categorySlug}`} className="text-muted-foreground hover:text-foreground">
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

      <div className="flex w-full flex-col gap-10 px-4 pt-2 pb-20 sm:px-8 lg:flex-row lg:gap-12 lg:px-16 lg:pb-28 xl:gap-[72px]">
        <ProductGallery photos={photos} badge={item.badge} />
        <div className="flex min-w-0 flex-1 flex-col gap-7 lg:pt-6">
          <ProductBuy
            product={item}
            eyebrow={t.eyebrow[item.categorySlug] ?? item.categoryName.toUpperCase()}
            description={productLong(product.slug, product.description, locale)}
            unit={unit}
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

      {related.length ? (
        <section
          aria-labelledby="also-like"
          className="flex w-full flex-col gap-8 px-4 pb-20 sm:px-8 lg:px-16 lg:pb-28"
        >
          <div className="flex w-full flex-wrap items-end justify-between gap-4">
            <h2
              id="also-like"
              className="font-display text-[32px] leading-[35px] font-bold tracking-[-1px] text-foreground lg:text-[44px] lg:leading-[46px]"
            >
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
  );
}
