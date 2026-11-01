import Image from "next/image";
import Link from "next/link";
import { MapPin, QrCode, Store, Truck } from "lucide-react";
import { directionsUrl } from "@/components/content/hours";
import { ReviewBand } from "@/components/home/review-band";
import { Chip } from "@/components/ui/badges";
import { ArrowLink, buttonClasses } from "@/components/ui/button";
import { Cutout, Snapshot, photoFrame } from "@/components/ui/snapshot";
import { SizePickerButton } from "@/components/shop/add-to-cart";
import { MenuItemCard } from "@/components/shop/menu-item-card";
import { OccasionCard } from "@/components/shop/occasion-card";
import { toShopCategories } from "@/components/shop/shop-product";
import { UspMarquee } from "@/components/shop/usp-marquee";
import { brownieServingsShort, productContent, productLong } from "@/content/products";
import { getLocale, getMessages } from "@/i18n/server";
import { homeMessages } from "@/i18n/messages/home";
import { storyMessages } from "@/i18n/messages/pages/story";
import { getMenu } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";

const eyebrow = "font-mono text-[13px] leading-[20px] font-semibold tracking-[1px] text-primary";
const sectionTitle = "font-display type-section font-bold text-balance text-foreground";
const sectionSub = "max-w-[560px] text-pretty text-base leading-normal text-muted-foreground lg:text-lg";
const px = "px-4 sm:px-8 lg:px-16";
/** Mobile hero art direction: where each 0.45× copy of the hero photo is pinned, and the part it keeps. */
const heroCorners = [
  "top-0 left-0 [mask-image:radial-gradient(ellipse_300px_330px_at_0_0,#000_55%,transparent)]",
  "right-0 bottom-0 [mask-image:radial-gradient(ellipse_330px_300px_at_100%_100%,#000_55%,transparent)]",
];

/**
 * pen: Landing page (syGdV). Content sections carry `section-y`; the tinted panels between
 * them (brownies, story, reviews) carry no outer padding, so every gap is one section-y.
 */
export default async function HomePage() {
  const [t, story, locale, menu, settings] = await Promise.all([
    getMessages(homeMessages),
    getMessages(storyMessages),
    getLocale(),
    getMenu(),
    getStoreSettings(),
  ]);
  const categories = toShopCategories(menu, locale);
  const products = categories.flatMap((c) => c.products);
  const cookies = categories.find((c) => c.slug === "soft-cookies")?.products ?? [];
  const tiramisu = categories.find((c) => c.slug === "tiramisu")?.products ?? [];
  const brownies = categories.find((c) => c.slug === "brownies")?.products.find((p) => p.variants.length > 1);
  const brownieRow = menu.flatMap((c) => c.products).find((p) => p.slug === brownies?.slug);
  const newProduct = products.find((p) => productContent[p.slug]?.badge?.label.en === "New");
  const cookiesFrom = cookies.length ? Math.min(...cookies.map((p) => p.fromPrice)) : null;
  const directions = directionsUrl(settings);

  const usps = [
    { icon: Truck, label: t.usp.delivery },
    { icon: Store, label: t.usp.pickup },
    { icon: QrCode, label: t.usp.pay },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col">
      {/* Hero */}
      <section className="w-full px-3 pb-3 sm:px-6 sm:pb-6">
        {/* A full-bleed panel with content over the photo: no photoFrame ring, its own edge is enough. */}
        <div className={cn(
            "relative flex min-h-[520px] overflow-hidden rounded-m w-full flex-col items-center justify-center gap-5 [--focus-ring:var(--white)] px-5 py-12 text-center sm:gap-6 lg:min-h-[600px] lg:px-40",
          )}>
          <Image
            src="/images/site/hero-background.png"
            alt={t.heroAlt}
            fill
            priority
            quality={100}
            sizes="(min-width: 1440px) 1392px, 100vw"
            className="object-cover"
          />
          {/* Below md the centred crop is plain green (the desserts sit at the photo's edges), so two
              smaller copies, faded out with a mask, frame the copy from the top-left and bottom-right. */}
          {heroCorners.map((corner) => (
            <div key={corner} className={cn("absolute h-[461px] w-[691px] md:hidden", corner)} aria-hidden>
              <Image src="/images/site/hero-background.png" alt="" fill quality={100} sizes="691px" />
            </div>
          ))}
          <div
            className="absolute inset-0 bg-radial-[ellipse_55%_60%_at_50%_50%] from-ink/70 to-ink/15 max-lg:from-ink/75 max-lg:to-ink/45"
            aria-hidden
          />
          {newProduct ? (
            <Link
              href={`/menu/${newProduct.slug}`}
              className="relative rounded-pill transition-opacity after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:opacity-90"
            >
              <Chip className="bg-highlight! text-ink">{t.hero.chip(newProduct.name)}</Chip>
            </Link>
          ) : null}
          <h1 className="relative w-full font-display type-hero font-bold text-balance text-white">{t.hero.title}</h1>
          <p className="relative max-w-[600px] text-pretty text-[17px] leading-[26px] text-white lg:text-xl lg:leading-[30px]">
            {t.hero.sub}
          </p>
          <div className="relative flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/menu" className={buttonClasses("inverse", "text-moss-deep!")}>
              {t.hero.order}
            </Link>
            <Link
              href="/location"
              className={buttonClasses("secondary", "text-white! inset-ring-white! hover:bg-white/10!")}
            >
              {t.hero.visit}
            </Link>
          </div>
          {cookiesFrom !== null ? (
            <p className="relative font-mono text-[13px] leading-[20px] font-semibold text-white sm:text-sm sm:leading-[21px]">
              {t.hero.proof(products.length, formatRupiah(cookiesFrom))}
            </p>
          ) : null}
        </div>
      </section>

      {/* USP strip — endless marquee */}
      <UspMarquee items={usps} label={t.usp.label} pauseLabel={t.usp.pause} />

      {/* Cookies */}
      {cookies.length ? (
        <section className={cn("section-y flex w-full flex-col gap-6 lg:gap-8", px)} aria-labelledby="home-cookies">
          <SectionHead
            id="home-cookies"
            eyebrowText={t.cookies.eyebrow}
            title={t.cookies.title}
            sub={t.cookies.sub(cookies.length)}
            link={<ArrowLink href="/menu?category=soft-cookies">{t.cookies.link}</ArrowLink>}
          />
          <div className="grid w-full grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-6">
            {cookies.map((p) => (
              <MenuItemCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Brownies band */}
      {brownies && brownieRow ? (
        <section className="w-full px-3 sm:px-6" aria-labelledby="home-brownies">
          <div className="panel-y flex w-full flex-col items-center gap-6 rounded-m bg-tint-lavender px-5 sm:px-10 lg:flex-row lg:gap-16 lg:px-16">
            <div className="relative aspect-[560/500] w-full max-w-[560px] shrink-0">
              <div className={cn(photoFrame, "absolute top-[6%] left-[3.5714%] h-[88%] w-[92.857%] bg-oat")}>
                <Image
                  src={brownies.imageUrl}
                  alt={t.browniesAlt}
                  fill
                  quality={100}
                  sizes="(min-width: 1024px) 520px, 90vw"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-6">
              <p className={eyebrow}>{t.brownies.eyebrow}</p>
              <h2 id="home-brownies" className={sectionTitle}>
                {t.brownies.title}
              </h2>
              <p className="text-pretty text-base leading-normal text-muted-foreground lg:text-lg">
                {productLong(brownieRow.slug, brownieRow.description, locale)}
              </p>
              <dl className="flex w-full flex-col" aria-label={t.brownies.sizes}>
                {brownies.variants.map((v) => {
                  const serves = brownieServingsShort[v.name]?.[locale];
                  return (
                    <div
                      key={v.id}
                      className="flex w-full items-center gap-4 py-4 shadow-[inset_0_-1px_0_color-mix(in_srgb,var(--border)_20%,transparent)]"
                    >
                      <dt className="flex-1 font-display text-lg leading-[22px] font-semibold whitespace-nowrap text-foreground lg:text-xl lg:leading-[24px]">
                        {v.name}
                      </dt>
                      {serves ? <dd className="text-sm leading-normal text-muted-foreground">{serves}</dd> : null}
                      <dd className="w-[92px] text-right text-base leading-normal font-bold text-foreground lg:w-[110px]">
                        {formatRupiah(v.price)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <SizePickerButton product={brownies} className={buttonClasses("primary")}>
                {t.brownies.cta}
              </SizePickerButton>
            </div>
          </div>
        </section>
      ) : null}

      {/* Tiramisu */}
      {tiramisu.length ? (
        <section className={cn("section-y flex w-full flex-col gap-6 lg:gap-8", px)} aria-labelledby="home-tiramisu">
          <SectionHead
            id="home-tiramisu"
            eyebrowText={t.tiramisu.eyebrow}
            title={t.tiramisu.title}
            sub={t.tiramisu.sub}
          />
          <div className="grid w-full grid-cols-2 gap-x-4 gap-y-8 lg:gap-6">
            {tiramisu.map((p) => (
              <MenuItemCard key={p.id} product={p} size="lg" />
            ))}
          </div>
        </section>
      ) : null}

      {/* Story band (owner-requested, after Levain's tinted story panel): a framed snapshot and a
          short home line, with a cookie cut-out resting on the panel edge. */}
      <section className="w-full px-3 sm:px-6" aria-labelledby="home-story">
        <div className="panel-y relative flex w-full flex-col items-center gap-6 rounded-m bg-mint px-5 sm:px-10 lg:flex-row lg:gap-20 lg:px-16">
          <Cutout
            name="chocolate-chunk"
            width={132}
            className="-bottom-8 left-[-10px] hidden lg:block"
          />
          <div className="relative w-full max-w-[440px] shrink-0 px-2 lg:w-[440px] lg:px-0">
            <Snapshot
              src="/images/site/hero-cookies.png"
              alt={t.story.alt}
              sizes="(min-width: 1024px) 440px, 90vw"
              className="aspect-[16/10] w-full md:aspect-[4/5]"
              imageClassName="object-[50%_62%]"
            />
            <Cutout
              name="double-chocolate"
              width={120}
              className="-right-14 -bottom-9 hidden lg:block"
            />
          </div>
          <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-6 lg:max-w-[640px]">
            <h2 id="home-story" className={sectionTitle}>
              {t.story.title}
            </h2>
            <p className="text-pretty text-base leading-normal text-muted-foreground lg:text-lg">{story.body}</p>
            <ArrowLink href="/our-story">{t.story.link}</ArrowLink>
          </div>
        </div>
      </section>

      {/* Occasions */}
      <section className={cn("section-y flex w-full flex-col gap-6 lg:gap-8", px)} aria-labelledby="home-occasions">
        <SectionHead id="home-occasions" eyebrowText={t.occasions.eyebrow} title={t.occasions.title} />
        <div className="grid w-full grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-3">
          <OccasionCard
            image="/images/site/gift-box.png"
            alt={t.occasions.gifting.alt}
            title={t.occasions.gifting.title}
            body={t.occasions.gifting.body}
            href="/menu"
            linkLabel={t.occasions.gifting.link}
          />
          <OccasionCard
            image="/images/site/party-spread.png"
            alt={t.occasions.gatherings.alt}
            title={t.occasions.gatherings.title}
            body={t.occasions.gatherings.body}
            href="/menu?category=brownies"
            linkLabel={t.occasions.gatherings.link}
          />
          <OccasionCard
            image="/images/site/story-bakers.png"
            alt={t.occasions.kitchen.alt}
            title={t.occasions.kitchen.title}
            body={t.occasions.kitchen.body}
            href="/our-story"
            linkLabel={t.occasions.kitchen.link}
          />
        </div>
      </section>

      {/* Reviews (illustrative) */}
      <ReviewBand t={t.reviews} products={products} city={settings.city} />

      {/* Visit */}
      <section
        className={cn("section-y flex w-full flex-col items-center gap-8 lg:flex-row lg:gap-16", px)}
        aria-labelledby="home-visit"
      >
        <Snapshot
          src="/images/site/store-front.png"
          alt={t.visit.alt}
          sizes="(min-width: 1024px) 640px, 100vw"
          className="aspect-[640/389] w-full shrink-0 lg:w-[640px]"
        />
        <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-6">
          <p className={eyebrow}>{t.visit.eyebrow}</p>
          <h2 id="home-visit" className={sectionTitle}>
            {t.visit.title}
          </h2>
          <div className="flex w-full gap-3.5 rounded-sm bg-mint p-5">
            <MapPin className="size-[22px] shrink-0 text-foreground" aria-hidden />
            <address className="flex-1 text-base leading-normal font-semibold text-foreground not-italic">
              {settings.address}
            </address>
          </div>
          <a href={directions} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary")}>
            {t.visit.directions}
          </a>
        </div>
      </section>
    </div>
  );
}

function SectionHead({
  id,
  eyebrowText,
  title,
  sub,
  link,
}: {
  id: string;
  eyebrowText: string;
  title: string;
  sub?: string;
  link?: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className={eyebrow}>{eyebrowText}</p>
        <h2 id={id} className={sectionTitle}>
          {title}
        </h2>
        {sub ? <p className={sectionSub}>{sub}</p> : null}
      </div>
      {link ? <div className="shrink-0">{link}</div> : null}
    </div>
  );
}
