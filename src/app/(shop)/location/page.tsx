import type { Metadata } from "next";
import Image from "next/image";
import { Landmark, MapPin, Motorbike, Quote, Smartphone, Star } from "lucide-react";
import { Eyebrow } from "@/components/content/eyebrow";
import { directionsUrl, formatOpeningHours, halfHourBefore } from "@/components/content/hours";
import { Sticker } from "@/components/ui/badges";
import { ArrowLink, ButtonLink, buttonClasses } from "@/components/ui/button";
import { Snapshot, photoFrame } from "@/components/ui/snapshot";
import { locationMessages } from "@/i18n/messages/pages/location";
import { getLocale, getMessages } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(locationMessages);
  return { title: t.metaTitle, description: t.metaDescription };
}

const linkClass = "underline underline-offset-2 hover:text-foreground-inverse";
const sectionTitle = "type-section font-display text-balance font-bold text-foreground";
const sectionSub = "max-w-[560px] text-pretty text-base leading-normal text-muted-foreground lg:text-lg";
const px = "px-4 sm:px-8 lg:px-16";
const routeStyle = [
  { icon: Motorbike, fill: "bg-accent-mustard" },
  { icon: Smartphone, fill: "bg-accent-teal" },
  { icon: Landmark, fill: "bg-accent-lavender" },
];
/** Illustrative regulars: the product each one orders, and the tint of their card. */
const regulars = [
  { slug: "chocolate-chunk", product: "Chocolate Chunk", bg: "bg-tint-mustard" },
  { slug: "fudgy-brownies", product: "Fudgy Brownies", bg: "bg-tint-lavender" },
  { slug: "matcha-tiramisu", product: "Matcha Tiramisu", bg: "bg-tint-salmon" },
];

/** pen: Location (QwcUD), plus owner-approved sections below the storefront. */
export default async function LocationPage() {
  const [t, locale, settings] = await Promise.all([getMessages(locationMessages), getLocale(), getStoreSettings()]);
  // "Jl. Palem Sememi Raya F16," / "Sememi, Benowo, Surabaya" as drawn.
  const [street, ...rest] = settings.address.split(",").map((part) => part.trim());
  const tel = `tel:${settings.phone.replace(/\s/g, "")}`;

  return (
    <>
      <section className="flex w-full flex-col gap-4 px-4 pt-6 pb-6 sm:px-8 lg:px-16 lg:pt-12 lg:pb-8">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h1 className="type-page font-display text-balance font-bold text-foreground">
          {t.title(settings.city)}
        </h1>
      </section>

      <section className="flex w-full flex-col gap-6 px-4 sm:px-8 lg:flex-row lg:px-16">
        <div className={cn(photoFrame, "aspect-[4/3] w-full lg:aspect-auto lg:min-h-[420px] lg:flex-1")}>
          <Image
            src="/images/site/store-front.png"
            alt={t.imageAlt}
            fill
            priority
            quality={100}
            sizes="(min-width: 1024px) calc(100vw - 592px), 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex w-full flex-col lg:w-[440px] lg:shrink-0">
          <div className="flex flex-col gap-5 rounded-m bg-surface-inverse [--focus-ring:var(--white)] p-6 sm:p-8">
            <MapPin className="size-8 text-highlight" aria-hidden />
            <h2 className="type-section font-display text-balance font-bold text-foreground-inverse">
              {settings.storeName} {settings.city}
            </h2>
            <address className="text-lg leading-[27px] text-mint not-italic">
              {rest.length > 0 ? (
                <>
                  {street},
                  <br />
                  {rest.join(", ")}
                </>
              ) : (
                settings.address
              )}
            </address>
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm leading-5 font-semibold text-mint">{t.hoursTitle}</p>
              <p className="font-mono text-base leading-6 font-semibold text-foreground-inverse">
                {formatOpeningHours(settings, locale)} WIB
              </p>
              <p className="text-pretty pt-1 text-sm leading-[21px] text-mint">{t.hoursNote}</p>
            </div>
            <a
              href={directionsUrl(settings)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.openMapLabel}
              className="inline-flex w-full items-center justify-center rounded-sm px-7 py-4 font-display text-[15px] leading-[1.2] font-semibold tracking-[0.5px] text-foreground-inverse inset-ring-[1.5px] inset-ring-foreground-inverse transition-colors hover:bg-white/15"
            >
              {t.openMap}
            </a>
            <p className="text-[15px] leading-[23px] break-words text-mint">
              {t.callPrefix}
              <a href={tel} className={linkClass}>
                {settings.phone}
              </a>
              {t.emailMiddle}
              <a href={`mailto:${settings.email}`} className={linkClass}>
                {settings.email}
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Hours + getting here */}
      <section className={cn("section-y flex w-full flex-col gap-8 lg:gap-12", px)} aria-labelledby="location-visit">
        <div className="flex w-full flex-col gap-4">
          <h2 id="location-visit" className={cn(sectionTitle, "lg:max-w-[720px]")}>
            {t.visitTitle}
          </h2>
          <p className={cn(sectionSub, "max-w-[560px]")}>{t.visitSub}</p>
        </div>

        <ul aria-label={t.routesLabel} className="grid w-full grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          {t.routes.map((route, i) => {
            const Icon = routeStyle[i].icon;
            return (
              <li
                key={route.title}
                className="flex gap-4 sm:gap-6 lg:flex-col lg:gap-5 lg:pt-6 lg:shadow-[inset_0_1px_0_var(--border-divider)]"
              >
                <span
                  className={cn("flex size-12 shrink-0 items-center justify-center rounded-pill sm:size-14", routeStyle[i].fill)}
                  aria-hidden
                >
                  <Icon className="size-6 text-ink" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
                  <h3 className="font-display text-[24px] leading-[28px] font-bold text-foreground lg:text-[24px] lg:leading-[28px]">
                    {route.title}
                  </h3>
                  <p className="max-w-[600px] text-pretty text-base leading-normal text-muted-foreground">{route.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Regulars (illustrative reviews) */}
      <section className={cn("section-y flex w-full flex-col gap-8 lg:gap-12", px)} aria-labelledby="location-reviews">
        <div className="flex w-full flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h2 id="location-reviews" className={sectionTitle}>
              {t.reviewsTitle}
            </h2>
            <p className={sectionSub}>{t.reviewsSub}</p>
          </div>
          <Sticker className="shrink-0 rotate-0 gap-2 sm:mb-2">
            <Star className="size-4 shrink-0 fill-highlight text-foreground" aria-hidden />
            {t.rating}
          </Sticker>
        </div>
        <ul className="grid w-full grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
          {t.reviews.map((review, i) => {
            const pick = regulars[i];
            return (
              <li key={review.name} className={cn("flex flex-col gap-5 rounded-m p-6 lg:gap-6 lg:p-8", pick.bg)}>
                <figure className="flex flex-1 flex-col gap-6">
                  <Quote className="size-7 text-primary" aria-hidden />
                  <blockquote className="flex-1 font-display text-[22px] leading-[29px] font-semibold text-pretty text-foreground">
                    {review.quote}
                  </blockquote>
                  <figcaption className="flex items-center gap-3.5">
                    <span className={cn(photoFrame, "size-14 shrink-0 rounded-pill bg-background")}>
                      <Image
                        src={`/images/products/${pick.slug}.png`}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-base leading-6 font-bold text-foreground">{review.name}</span>
                      <span className="font-mono text-[13px] leading-5 font-semibold text-muted-foreground">
                        {review.area}, {settings.city}
                      </span>
                    </span>
                  </figcaption>
                </figure>
                <ArrowLink href={`/menu/${pick.slug}`} className="w-fit">
                  {t.tryProduct(pick.product)}
                </ArrowLink>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Order ahead */}
      <section className="section-y w-full px-3 md:px-6" aria-labelledby="location-cta">
        <div className="flex w-full flex-col gap-10 rounded-m bg-mint px-6 panel-y sm:px-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-16">
          <div className="flex flex-col items-start gap-4">
            <h2
              id="location-cta"
              className="type-section font-display text-balance font-bold text-foreground"
            >
              {t.ctaTitle}
            </h2>
            <p className="max-w-[560px] text-pretty text-lg leading-[27px] text-muted-foreground">
              {t.ctaBody(formatRupiah(settings.deliveryFee), settings.deliveryMaxKm)}
            </p>
            <p className="max-w-[560px] text-pretty text-base leading-normal font-semibold text-foreground">
              {t.pickupCutoff(halfHourBefore(settings))}
            </p>
            <div className="flex w-full flex-col gap-4 pt-4 sm:w-auto sm:flex-row sm:items-center">
              <ButtonLink href="/menu">{t.ctaOrder}</ButtonLink>
              <a href={tel} className={buttonClasses("secondary")}>
                {t.ctaCall}
              </a>
            </div>
          </div>
          <Snapshot
            src="/images/site/gift-box.png"
            alt=""
            sizes="(min-width: 1024px) 560px, 90vw"
            className="aspect-[4/3] w-full lg:aspect-[5/4]"
            imageClassName="object-[50%_60%]"
          />
        </div>
      </section>
    </>
  );
}
