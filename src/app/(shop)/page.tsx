import Image from "next/image";
import Link from "next/link";
import { Clock, Cookie, MapPin, QrCode, ShoppingBag, Store, Truck } from "lucide-react";
import { formatOpeningHours } from "@/components/content/hours";
import { Chip, Sticker } from "@/components/ui/badges";
import { ArrowLink, buttonClasses } from "@/components/ui/button";
import { Cutout, Snapshot } from "@/components/ui/snapshot";
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
const sectionTitle =
  "font-display text-[36px] leading-[38px] font-bold tracking-[-1px] text-foreground sm:text-[44px] sm:leading-[46px] lg:text-[56px] lg:leading-[57px]";
const sectionSub = "max-w-[560px] text-base leading-normal text-muted-foreground lg:text-lg";
const px = "px-4 sm:px-8 lg:px-16";
/** Mobile hero art direction: where each 0.45× copy of the hero photo is pinned, and the part it keeps. */
const heroCorners = [
  "top-0 left-0 [mask-image:radial-gradient(ellipse_300px_330px_at_0_0,#000_55%,transparent)]",
  "right-0 bottom-0 [mask-image:radial-gradient(ellipse_330px_300px_at_100%_100%,#000_55%,transparent)]",
];

/** pen: Landing page (syGdV). */
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
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(settings.address)}`;

  const usps = [
    { icon: Cookie, label: t.usp.fresh },
    { icon: Truck, label: t.usp.delivery },
    { icon: Store, label: t.usp.pickup },
    { icon: QrCode, label: t.usp.pay },
  ];
  const valueDots = ["bg-accent-mustard", "bg-accent-teal", "bg-accent-lavender"];
  const stepStyle = [
    { icon: ShoppingBag, fill: "bg-accent-mustard" },
    { icon: Truck, fill: "bg-accent-teal" },
    { icon: QrCode, fill: "bg-accent-lavender" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col">
      {/* Hero */}
      <section className="w-full px-3 pb-3 sm:px-6 sm:pb-6">
        <div className="relative flex min-h-[620px] w-full flex-col items-center justify-center gap-6 overflow-hidden rounded-m [--focus-ring:var(--white)] px-5 py-16 text-center sm:gap-7 lg:h-[720px] lg:px-40 lg:py-0">
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
          <Chip className="relative bg-highlight! text-ink">{t.hero.chip}</Chip>
          <h1 className="relative w-full font-display text-[52px] leading-[50px] font-bold tracking-[-1.5px] text-white sm:text-[80px] sm:leading-[76px] lg:text-[112px] lg:leading-[106px] lg:tracking-[-3px]">
            {t.hero.title}
          </h1>
          <p className="relative max-w-[600px] text-[17px] leading-[26px] text-white lg:text-xl lg:leading-[30px]">
            {t.hero.sub}
          </p>
          <div className="relative flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/menu" className={buttonClasses("inverse", "text-moss-deep!")}>
              {t.hero.order}
            </Link>
            <Link
              href="/menu"
              className={buttonClasses("secondary", "text-white! inset-ring-white! hover:bg-white/10!")}
            >
              {t.hero.menu}
            </Link>
          </div>
          {cookiesFrom !== null ? (
            <div className="relative flex flex-wrap items-center justify-center gap-2.5">
              <span className="flex items-center gap-2.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-accent-magenta" />
                <span className="size-2.5 rounded-full bg-accent-mustard" />
                <span className="size-2.5 rounded-full bg-accent-teal" />
                <span className="size-2.5 rounded-full bg-accent-lavender" />
              </span>
              <p className="font-mono text-[13px] leading-[20px] font-semibold text-white sm:text-sm sm:leading-[21px]">
                {t.hero.proof(products.length, formatRupiah(cookiesFrom))}
              </p>
            </div>
          ) : null}
          {newProduct ? (
            <Link
              href={`/menu/${newProduct.slug}`}
              className="absolute top-[560px] left-[calc(100%-292px)] hidden xl:block"
            >
              <Sticker className="origin-top-left">{t.hero.sticker(newProduct.name)}</Sticker>
            </Link>
          ) : null}
        </div>
      </section>

      {/* USP strip — endless marquee */}
      <UspMarquee items={usps} label={t.usp.label} pauseLabel={t.usp.pause} />

      {/* Cookies */}
      {cookies.length ? (
        <section
          className={cn("flex w-full flex-col gap-10 pt-20 pb-16 lg:pt-28 lg:pb-24", px)}
          aria-labelledby="home-cookies"
        >
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
          <div className="flex w-full flex-col items-center gap-10 rounded-m bg-tint-lavender px-5 py-12 sm:px-10 lg:flex-row lg:gap-20 lg:px-16 lg:py-[88px]">
            <div className="relative aspect-[560/500] w-full max-w-[560px] shrink-0">
              <div className="absolute top-[6%] left-[3.5714%] h-[88%] w-[92.857%] origin-top-left -rotate-3 overflow-hidden rounded-m bg-oat">
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
              <h2
                id="home-brownies"
                className="font-display text-[34px] leading-[36px] font-bold tracking-[-1px] text-foreground sm:text-[44px] sm:leading-[46px] lg:text-[52px] lg:leading-[53px]"
              >
                {t.brownies.title}
              </h2>
              <p className="text-base leading-normal text-muted-foreground lg:text-lg">
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
                      <dt className="flex-1 font-display text-lg leading-[22px] font-semibold text-foreground lg:text-xl lg:leading-[24px]">
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
        <section className={cn("flex w-full flex-col gap-10 pt-20 lg:pt-28", px)} aria-labelledby="home-tiramisu">
          <SectionHead
            id="home-tiramisu"
            eyebrowText={t.tiramisu.eyebrow}
            title={t.tiramisu.title}
            sub={t.tiramisu.sub}
          />
          <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2">
            {tiramisu.map((p) => (
              <MenuItemCard key={p.id} product={p} size="lg" />
            ))}
          </div>
        </section>
      ) : null}

      {/* Story band (owner-requested, after Levain's tinted story panel): a tilted snapshot,
          the our-story headline and values, with a cookie cut-out resting on the panel edge. */}
      <section className="w-full px-3 pt-20 sm:px-6 lg:pt-28" aria-labelledby="home-story">
        <div className="group/band relative flex w-full flex-col gap-12 rounded-m bg-mint px-5 py-12 sm:px-10 lg:gap-16 lg:px-16 lg:py-[88px]">
          <Cutout
            name="chocolate-chunk"
            width={132}
            className="-bottom-8 left-[-10px] hidden -rotate-12 transition-[rotate] duration-700 ease-out group-hover/band:-rotate-[22deg] motion-reduce:transition-none lg:block"
          />
          <div className="flex w-full flex-col items-center gap-10 lg:flex-row lg:gap-20">
            <div className="relative w-full max-w-[440px] shrink-0 px-2 lg:w-[440px] lg:px-0">
              <Snapshot
                src="/images/site/hero-cookies.png"
                alt={t.story.alt}
                tilt="left-strong"
                sizes="(min-width: 1024px) 440px, 90vw"
                className="aspect-[4/5] w-full"
                imageClassName="object-[50%_62%]"
              />
              <Cutout
                name="double-chocolate"
                width={120}
                className="-right-14 -bottom-9 hidden rotate-[8deg] transition-[rotate] duration-700 ease-out group-hover/band:rotate-[-4deg] motion-reduce:transition-none lg:block"
              />
            </div>
            <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-6 lg:max-w-[540px]">
              <h2
                id="home-story"
                className="font-display text-[34px] leading-[36px] font-bold tracking-[-1px] text-foreground sm:text-[44px] sm:leading-[46px] lg:text-[52px] lg:leading-[53px]"
              >
                {story.title}
              </h2>
              <p className="text-base leading-normal text-muted-foreground lg:text-lg">{story.body}</p>
              <ArrowLink href="/our-story">{t.story.link}</ArrowLink>
            </div>
          </div>
          <ul
            aria-label={t.story.label}
            className="grid w-full grid-cols-1 gap-8 pt-10 shadow-[inset_0_1px_0_var(--border-divider)] md:grid-cols-3 md:gap-10"
          >
            {story.values.map((value, i) => (
              <li key={value.title} className="flex flex-col gap-2.5">
                <span className={cn("size-4 rounded-full", valueDots[i])} aria-hidden />
                <h3 className="font-display text-[22px] leading-[26px] font-bold text-foreground lg:text-[24px] lg:leading-[28px]">
                  {value.title}
                </h3>
                <p className="text-[15px] leading-[23px] text-muted-foreground">{value.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Occasions */}
      <section className={cn("flex w-full flex-col gap-10 pt-20 lg:pt-28", px)} aria-labelledby="home-occasions">
        <SectionHead
          id="home-occasions"
          eyebrowText={t.occasions.eyebrow}
          title={t.occasions.title}
          link={<ArrowLink href="/menu">{t.occasions.link}</ArrowLink>}
        />
        <div className="grid w-full grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-3">
          <OccasionCard
            image="/images/site/gift-box.png"
            alt={t.occasions.gifting.alt}
            title={t.occasions.gifting.title}
            body={t.occasions.gifting.body}
            href="/menu"
            linkLabel={t.occasions.gifting.link}
            tilt="left"
          />
          <OccasionCard
            image="/images/site/party-spread.png"
            alt={t.occasions.gatherings.alt}
            title={t.occasions.gatherings.title}
            body={t.occasions.gatherings.body}
            href="/menu?category=brownies"
            linkLabel={t.occasions.gatherings.link}
            tilt="right"
          />
          <OccasionCard
            image="/images/site/story-bakers.png"
            alt={t.occasions.kitchen.alt}
            title={t.occasions.kitchen.title}
            body={t.occasions.kitchen.body}
            href="/our-story"
            linkLabel={t.occasions.kitchen.link}
            tilt="left"
          />
        </div>
      </section>

      {/* How to order */}
      <section className={cn("flex w-full flex-col gap-10 pt-20 lg:gap-12 lg:pt-28", px)} aria-labelledby="home-steps">
        <div className="flex w-full flex-col items-center gap-3 text-center">
          <p className={eyebrow}>{t.steps.eyebrow}</p>
          <h2 id="home-steps" className={sectionTitle}>
            {t.steps.title}
          </h2>
        </div>
        <ol className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {t.steps.items(formatRupiah(settings.deliveryFee)).map((step, i) => {
            const Icon = stepStyle[i].icon;
            return (
              <li key={step.title} className="flex flex-col gap-5 rounded-m bg-card p-6 lg:p-8">
                <div className="flex w-full items-center justify-between">
                  <span
                    className={cn(
                      "flex size-14 items-center justify-center rounded-pill font-display text-[26px] leading-none font-bold text-ink",
                      stepStyle[i].fill,
                    )}
                  >
                    {i + 1}
                  </span>
                  <Icon className="size-7 text-foreground" aria-hidden />
                </div>
                <h3 className="font-display text-[24px] leading-[28px] font-bold text-foreground lg:text-[26px] lg:leading-[30px]">
                  {step.title}
                </h3>
                <p className="text-base leading-normal text-muted-foreground">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Visit */}
      <section
        className={cn("flex w-full flex-col items-center gap-10 py-20 lg:flex-row lg:gap-[72px] lg:py-28", px)}
        aria-labelledby="home-visit"
      >
        <div className="relative mb-4 w-full shrink-0 lg:mb-0 lg:w-[640px]">
          <Snapshot
            src="/images/site/store-front.png"
            alt={t.visit.alt}
            tilt="right"
            sizes="(min-width: 1024px) 640px, 100vw"
            className="aspect-[640/389] w-full"
          />
          <Sticker className="absolute -bottom-4 left-4 inline-flex items-center gap-2 rotate-[-5deg] sm:left-6">
            <Clock className="size-4 shrink-0" aria-hidden />
            {t.visit.hours(formatOpeningHours(settings, locale))}
          </Sticker>
        </div>
        <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-6">
          <p className={eyebrow}>{t.visit.eyebrow}</p>
          <h2 id="home-visit" className={sectionTitle}>
            {t.visit.title}
          </h2>
          <p className="text-base leading-normal text-muted-foreground lg:text-lg">{t.visit.body(settings.address)}</p>
          <div className="flex w-full gap-3.5 rounded-sm bg-mint p-5">
            <MapPin className="size-[22px] shrink-0 text-foreground" aria-hidden />
            <address className="max-w-[180px] flex-1 text-base leading-normal font-semibold text-foreground not-italic">
              {settings.address}
            </address>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a href={directions} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary")}>
              {t.visit.directions}
            </a>
            <ArrowLink href="/our-story">{t.visit.story}</ArrowLink>
          </div>
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
    <div className="flex w-full flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
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
