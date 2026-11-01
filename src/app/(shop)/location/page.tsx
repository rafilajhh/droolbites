import type { Metadata } from "next";
import Image from "next/image";
import { Clock, Landmark, MapPin, Motorbike, Phone, Quote, Smartphone, Star, Store } from "lucide-react";
import { Eyebrow } from "@/components/content/eyebrow";
import { directionsUrl, formatOpeningHours } from "@/components/content/hours";
import { Chip, Sticker } from "@/components/ui/badges";
import { ArrowLink, ButtonLink, buttonClasses } from "@/components/ui/button";
import { Cutout, Snapshot, photoFrame } from "@/components/ui/snapshot";
import { locationMessages } from "@/i18n/messages/pages/location";
import { getLocale, getMessages } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { getStoreSettings, isOpenNow } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(locationMessages);
  return { title: t.metaTitle, description: t.metaDescription };
}

const linkClass = "underline underline-offset-2 hover:text-foreground";
const sectionTitle =
  "font-display text-[36px] leading-[38px] font-bold text-balance tracking-[-1px] text-foreground sm:text-[44px] sm:leading-[46px] lg:text-[56px] lg:leading-[57px]";
const sectionSub = "max-w-[560px] text-pretty text-base leading-normal text-muted-foreground lg:text-lg";
const px = "px-4 sm:px-8 lg:px-16";
const week = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
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
  const open = isOpenNow(settings);
  // "Jl. Palem Sememi Raya F16," / "Sememi, Benowo, Surabaya" as drawn.
  const [street, ...rest] = settings.address.split(",").map((part) => part.trim());
  const openDays = new Set(settings.openDays.split(",").map((d) => d.trim()));
  // Same clock as isOpenNow: the store's weekday in Surabaya time.
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Asia/Jakarta" })
    .format(new Date())
    .toLowerCase()
    .slice(0, 3);
  const tel = `tel:${settings.phone.replace(/\s/g, "")}`;

  return (
    <>
      <section className="flex w-full flex-col gap-4 px-4 pt-6 pb-8 sm:px-8 lg:px-16 lg:pt-12 lg:pb-10">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h1 className="font-display text-balance text-[44px] leading-[1.03] font-bold tracking-[-1px] text-foreground sm:text-[64px] lg:text-[80px] lg:leading-[82px] lg:tracking-[-2px]">
          {t.title(settings.city)}
        </h1>
      </section>

      <section className="flex w-full flex-col gap-6 px-4 sm:px-8 lg:flex-row lg:px-16">
        <div className={cn(photoFrame, "aspect-[4/3] w-full lg:aspect-auto lg:h-[620px] lg:flex-1")}>
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

        <div className="flex w-full flex-col gap-4 lg:h-[620px] lg:w-[440px] lg:shrink-0">
          <div className="flex flex-col gap-5 rounded-m bg-surface-inverse [--focus-ring:var(--white)] p-6 sm:p-8">
            <MapPin className="size-8 text-highlight" aria-hidden />
            <h2 className="font-display text-[32px] leading-[35px] font-bold text-foreground-inverse">
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
            <a
              href={directionsUrl(settings)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.openMapLabel}
              className="inline-flex w-full items-center justify-center rounded-sm px-7 py-4 font-display text-[15px] leading-[1.2] font-semibold tracking-[0.5px] text-foreground-inverse inset-ring-[1.5px] inset-ring-foreground-inverse transition-colors hover:bg-white/15"
            >
              {t.openMap}
            </a>
          </div>

          <div className="flex items-center gap-4 rounded-m bg-card p-6 lg:flex-1">
            <Store className="size-6 shrink-0 text-primary" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="text-base leading-6 font-bold text-foreground">{t.pickupTitle}</h2>
              <p className="text-[15px] leading-[23px] text-muted-foreground">{t.pickupBody}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-[13px] leading-5 font-semibold text-foreground">
                <span>{open ? t.openNow : t.closedNow}</span>
                <span className="font-normal text-muted-foreground">· {formatOpeningHours(settings, locale)} WIB</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-m bg-card p-6 lg:flex-1">
            <Phone className="size-6 shrink-0 text-primary" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="text-base leading-6 font-bold text-foreground">{t.questionsTitle}</h2>
              <p className="text-[15px] leading-[23px] break-words text-muted-foreground">
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
        </div>
      </section>

      {/* Hours + getting here */}
      <section className={cn("flex w-full flex-col gap-10 pt-20 lg:gap-12 lg:pt-28", px)} aria-labelledby="location-visit">
        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <h2 id="location-visit" className={cn(sectionTitle, "lg:max-w-[720px]")}>
            {t.visitTitle}
          </h2>
          <p className={cn(sectionSub, "lg:w-[440px] lg:shrink-0")}>{t.visitSub}</p>
        </div>

        <div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-[440px_minmax(0,1fr)] lg:gap-16">
          <div className="relative flex flex-col gap-6 rounded-m bg-card p-6 sm:p-8">
            <Cutout
              name="red-velvet"
              width={120}
              className="-top-12 -right-10 hidden lg:block"
            />
            <div className="flex items-center gap-3">
              <Clock className="size-6 shrink-0 text-primary" aria-hidden />
              <h3 className="font-display text-[24px] leading-[28px] font-bold text-foreground">{t.hoursTitle}</h3>
            </div>
            <dl className="flex flex-col">
              {week.map((day) => {
                const isToday = day === today;
                return (
                  <div
                    key={day}
                    className={cn(
                      "flex min-h-12 items-center gap-3 px-3",
                      isToday ? "rounded-sm bg-mint" : "shadow-[inset_0_-1px_0_var(--border-divider)]",
                    )}
                  >
                    <dt className={cn("flex flex-1 items-center gap-2.5 text-base leading-6 text-foreground", isToday && "font-bold")}>
                      {t.days[day]}
                      {isToday ? <Chip className="bg-background px-2.5 py-1 text-[12px] leading-4">{t.today}</Chip> : null}
                    </dt>
                    <dd className="font-mono text-sm leading-5 font-semibold text-foreground tabular-nums">
                      {openDays.has(day) ? `${settings.opensAt}–${settings.closesAt}` : t.closedDay}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="text-pretty text-sm leading-[21px] text-muted-foreground">{t.hoursNote}</p>
          </div>

          <ul aria-label={t.routesLabel} className="flex flex-col">
            {t.routes.map((route, i) => {
              const Icon = routeStyle[i].icon;
              return (
                <li
                  key={route.title}
                  className="flex gap-4 py-8 shadow-[inset_0_-1px_0_var(--border-divider)] first:pt-0 last:pb-0 last:shadow-none sm:gap-6"
                >
                  <span
                    className={cn("flex size-12 shrink-0 items-center justify-center rounded-pill sm:size-14", routeStyle[i].fill)}
                    aria-hidden
                  >
                    <Icon className="size-6 text-ink" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
                    <h3 className="font-display text-[24px] leading-[28px] font-bold text-foreground lg:text-[26px] lg:leading-[30px]">
                      {route.title}
                    </h3>
                    <p className="max-w-[600px] text-pretty text-base leading-normal text-muted-foreground">{route.body}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {route.tags.map((tag) => (
                        <Chip key={tag}>{tag}</Chip>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Regulars (illustrative reviews) */}
      <section className={cn("flex w-full flex-col gap-10 pt-20 lg:gap-12 lg:pt-28", px)} aria-labelledby="location-reviews">
        <div className="flex w-full flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h2 id="location-reviews" className={sectionTitle}>
              {t.reviewsTitle}
            </h2>
            <p className={sectionSub}>{t.reviewsSub}</p>
          </div>
          <Sticker className="shrink-0 gap-2 rotate-[-4deg] sm:mb-2">
            <Star className="size-4 shrink-0 fill-highlight text-foreground" aria-hidden />
            {t.rating}
          </Sticker>
        </div>
        <ul className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {t.reviews.map((review, i) => {
            const pick = regulars[i];
            return (
              <li key={review.name} className={cn("flex flex-col gap-6 rounded-m p-6 lg:p-8", pick.bg)}>
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
      <section className="w-full px-3 pt-20 pb-16 md:px-6 lg:pt-28 lg:pb-28" aria-labelledby="location-cta">
        <div className="flex w-full flex-col gap-10 rounded-m bg-mint px-6 py-10 sm:p-10 lg:flex-row lg:items-center lg:gap-16 lg:p-16">
          <div className="flex flex-1 flex-col items-start gap-4">
            <h2
              id="location-cta"
              className="font-display text-balance text-[34px] leading-[1.03] font-bold tracking-[-1px] text-foreground lg:text-[48px] lg:leading-[49px]"
            >
              {t.ctaTitle}
            </h2>
            <p className="max-w-[560px] text-pretty text-lg leading-[27px] text-muted-foreground">
              {t.ctaBody(formatRupiah(settings.deliveryFee))}
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
            sizes="(min-width: 1024px) 400px, 90vw"
            className="aspect-[4/3] w-full shrink-0 lg:aspect-[5/4] lg:w-[400px]"
            imageClassName="object-[50%_60%]"
          />
        </div>
      </section>
    </>
  );
}
