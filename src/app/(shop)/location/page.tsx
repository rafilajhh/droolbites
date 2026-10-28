import type { Metadata } from "next";
import Image from "next/image";
import { MapPin, Phone, Store } from "lucide-react";
import { Eyebrow } from "@/components/content/eyebrow";
import { directionsUrl, formatOpeningHours } from "@/components/content/hours";
import { locationMessages } from "@/i18n/messages/pages/location";
import { getLocale, getMessages } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { getStoreSettings, isOpenNow } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(locationMessages);
  return { title: t.metaTitle, description: t.metaDescription };
}

const linkClass = "underline underline-offset-2 hover:text-foreground";

/** pen: Location (QwcUD). */
export default async function LocationPage() {
  const [t, locale, settings] = await Promise.all([getMessages(locationMessages), getLocale(), getStoreSettings()]);
  const open = isOpenNow(settings);
  // "Jl. Palem Sememi Raya F16," / "Sememi, Benowo, Surabaya" as drawn.
  const [street, ...rest] = settings.address.split(",").map((part) => part.trim());

  return (
    <>
      <section className="flex w-full flex-col gap-4 px-4 pt-6 pb-8 sm:px-8 lg:px-16 lg:pt-12 lg:pb-10">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h1 className="font-display text-[44px] leading-[1.03] font-bold tracking-[-1px] text-foreground sm:text-[64px] lg:text-[80px] lg:leading-[82px] lg:tracking-[-2px]">
          {t.title(settings.city)}
        </h1>
      </section>

      <section className="flex w-full flex-col gap-6 px-4 pb-16 sm:px-8 lg:flex-row lg:px-16 lg:pb-28">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-m lg:aspect-auto lg:h-[620px] lg:flex-1">
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
                <span className={cn("size-2 rounded-full", open ? "bg-success" : "bg-accent-crimson")} aria-hidden />
                <span>{open ? t.openNow : t.closedNow}</span>
                <span className="font-normal text-muted-foreground">· {formatOpeningHours(settings, locale)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-m bg-card p-6 lg:flex-1">
            <Phone className="size-6 shrink-0 text-primary" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="text-base leading-6 font-bold text-foreground">{t.questionsTitle}</h2>
              <p className="text-[15px] leading-[23px] break-words text-muted-foreground">
                {t.callPrefix}
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className={linkClass}>
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
    </>
  );
}
