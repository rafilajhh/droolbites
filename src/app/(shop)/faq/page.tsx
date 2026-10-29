import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Eyebrow } from "@/components/content/eyebrow";
import { formatOpeningHours } from "@/components/content/hours";
import { toShopCategories } from "@/components/shop/shop-product";
import { AccordionItem } from "@/components/ui/accordion";
import { Sticker } from "@/components/ui/badges";
import { ArrowLink } from "@/components/ui/button";
import { Snapshot } from "@/components/ui/snapshot";
import { faqMessages, type FaqFacts } from "@/i18n/messages/pages/faq";
import { getLocale, getMessages } from "@/i18n/server";
import { getMenu } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { PAYMENT_GROUPS, PRIMARY_VA_COUNT, paymentMethodInfo } from "@/lib/order-status";
import { getPaymentOptions } from "@/lib/payments";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(faqMessages);
  return { title: t.metaTitle, description: t.metaDescription };
}

const contactLink = "flex w-fit items-center gap-2.5 text-[15px] leading-[23px] font-semibold text-foreground-inverse hover:underline";

/** "Not sure where to start?" row: three cookie favorites, on the our-story tile tints. */
const picks = [
  { slug: "red-velvet", bg: "bg-tint-salmon" },
  { slug: "double-chocolate", bg: "bg-tint-mustard" },
  { slug: "white-chocolate-almond", bg: "bg-tint-lavender" },
] as const;

/** pen: FAQ (ouetk). */
export default async function FaqPage() {
  const [t, locale, settings, menu] = await Promise.all([
    getMessages(faqMessages),
    getLocale(),
    getStoreSettings(),
    getMenu(),
  ]);

  // Exactly what checkout offers right now: store settings plus the gateway's active channels.
  const { methods: available } = await getPaymentOptions(settings);
  const groups = PAYMENT_GROUPS.map((group) => ({ key: group.key, methods: group.methods.filter((m) => available.includes(m)) })).filter(
    (group) => group.methods.length > 0,
  );
  const has = (key: string) => groups.some((group) => group.key === key);
  const methods: string[] = [];
  if (has("va")) methods.push(t.payments.va);
  if (has("qris")) methods.push(t.payments.qris);
  if (has("ewallet")) methods.push(t.payments.ewallet);
  const list = (items: string[], word: string) =>
    items.length > 1 ? `${items.slice(0, -1).join(", ")} ${word} ${items.at(-1)}` : (items[0] ?? "");
  const payments = list(methods, t.payments.or);

  // Same groups and order as the checkout payment step.
  const detail = groups.map((group) => {
    const names = group.methods.map((m) => paymentMethodInfo[m].name.replace(/ Virtual Account$/, ""));
    if (group.key === "ewallet") return t.paymentsDetail.ewallet(list(names, t.payments.or));
    if (group.key === "va") return t.paymentsDetail.va(names.slice(0, PRIMARY_VA_COUNT).join(", "), names.length > PRIMARY_VA_COUNT);
    if (group.key === "retail") return t.paymentsDetail.retail(list(names, t.payments.or));
    return t.payments.qris;
  });

  const products = toShopCategories(menu, locale).flatMap((c) => c.products);
  const picked = picks.flatMap((pick) => {
    const product = products.find((p) => p.slug === pick.slug);
    return product ? [{ ...pick, product, review: t.picks.reviews[pick.slug] }] : [];
  });

  const productsIn = (slug: string) => menu.find((c) => c.slug === slug)?.products ?? [];
  const brownieSizes = new Set(productsIn("brownies").flatMap((p) => p.variants.map((v) => v.name)));

  const facts: FaqFacts = {
    address: settings.address,
    hours: formatOpeningHours(settings, locale),
    deliveryFee: formatRupiah(settings.deliveryFee),
    email: settings.email,
    payments,
    paymentsDetail: list(detail, t.payments.or),
    counts: {
      cookies: productsIn("soft-cookies").length,
      brownieSizes: brownieSizes.size,
      tiramisu: productsIn("tiramisu").length,
    },
  };

  return (
    <>
      <section className="flex w-full flex-col gap-12 px-4 pt-6 pb-16 sm:px-8 lg:flex-row lg:gap-24 lg:px-16 lg:pt-14 lg:pb-24">
        {/* Sticky beside the long question list on desktops tall enough to show the whole column. */}
        <div className="flex w-full flex-col gap-5 lg:w-[400px] lg:shrink-0 lg:self-start [@media(min-height:940px)]:lg:sticky [@media(min-height:940px)]:lg:top-24">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="font-display text-balance text-[44px] leading-[1.03] font-bold tracking-[-1px] text-foreground lg:text-[64px] lg:leading-[65px] lg:tracking-[-2px]">
            {t.title}
          </h1>
          <p className="text-lg leading-[27px] text-muted-foreground">{t.sub}</p>
          <div className="flex flex-col gap-3.5 rounded-m bg-surface-inverse [--focus-ring:var(--white)] p-7">
            <h2 className="font-display text-2xl leading-[26px] font-bold text-foreground-inverse">{t.contactTitle}</h2>
            <a href={`mailto:${settings.email}`} className={contactLink}>
              <Mail className="size-[18px] shrink-0 text-highlight" aria-hidden />
              <span className="break-all">{settings.email}</span>
            </a>
            <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className={contactLink}>
              <Phone className="size-[18px] shrink-0 text-highlight" aria-hidden />
              {settings.phone}
            </a>
            <a
              href={`https://wa.me/${settings.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className={contactLink}
            >
              <MessageCircle className="size-[18px] shrink-0 text-highlight" aria-hidden />
              {t.whatsapp}
            </a>
          </div>
          <div className="relative hidden pt-3 lg:block">
            <Snapshot
              src="/images/site/gift-box.png"
              alt=""
              tilt="right"
              sizes="400px"
              className="aspect-[4/3] w-full"
              imageClassName="object-[50%_45%]"
            />
            <Sticker className="absolute -bottom-4 left-5">{t.sticker}</Sticker>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-12">
          {t.groups.map((group, gi) => (
            <div key={group.label} className="flex flex-col">
              <h2 className="font-mono text-[13px] leading-5 font-semibold tracking-[1px] text-muted-foreground">
                {group.label}
              </h2>
              {group.items.map((item, ii) => (
                <AccordionItem
                  key={item.q}
                  question={item.q}
                  defaultOpen={gi === 0 && ii === 0}
                  openStyle="minus"
                  questionClassName="leading-[28px] text-balance"
                >
                  {item.a(facts)}
                </AccordionItem>
              ))}
            </div>
          ))}
        </div>
      </section>

      {picked.length ? (
        <section className="flex w-full flex-col gap-10 px-4 pb-16 sm:px-8 lg:px-16 lg:pb-28" aria-labelledby="faq-picks">
          <div className="flex w-full flex-col items-start gap-6 pt-12 shadow-[inset_0_1px_0_var(--border-subtle)] sm:flex-row sm:items-end sm:justify-between sm:gap-12 lg:pt-16">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <h2
                id="faq-picks"
                className="font-display text-balance text-[36px] leading-[38px] font-bold tracking-[-1px] text-foreground sm:text-[44px] sm:leading-[46px]"
              >
                {t.picks.title}
              </h2>
              <p className="max-w-[560px] text-pretty text-base leading-normal text-muted-foreground lg:text-lg">{t.picks.sub}</p>
            </div>
            <div className="shrink-0">
              <ArrowLink href="/menu">{t.picks.link}</ArrowLink>
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
            {picked.map(({ slug, bg, product, review }) => (
              <article key={slug} className={cn("group/pick relative flex flex-col gap-6 rounded-m p-5", bg)}>
                <div className="relative h-[220px] w-full overflow-hidden rounded-sm lg:h-[240px]">
                  <Image
                    src={product.imageUrl}
                    alt=""
                    fill
                    quality={100}
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-[scale,rotate] duration-500 ease-out group-hover/pick:scale-[1.06] group-hover/pick:-rotate-2 motion-reduce:transition-none motion-reduce:group-hover/pick:scale-100 motion-reduce:group-hover/pick:rotate-0"
                  />
                </div>
                <figure className="flex flex-1 flex-col gap-3 px-2">
                  <blockquote className="font-display text-[20px] leading-[27px] font-medium text-pretty text-foreground lg:text-[22px] lg:leading-[29px]">
                    <p>“{review.quote}”</p>
                  </blockquote>
                  <figcaption className="font-mono text-[13px] leading-5 font-semibold text-muted-foreground">
                    {review.name} · {review.area}
                  </figcaption>
                </figure>
                <div className="mx-2 flex items-baseline justify-between gap-4 pt-4 pb-2 shadow-[inset_0_1px_0_var(--border-divider)]">
                  <h3 className="font-display text-[22px] leading-[25px] font-bold text-foreground">
                    <Link
                      href={`/menu/${slug}`}
                      className="after:absolute after:inset-0 after:rounded-m after:content-[''] hover:underline"
                    >
                      {product.name}
                    </Link>
                  </h3>
                  <p className="shrink-0 font-mono text-[13px] leading-5 font-semibold text-foreground">
                    {product.variants.length > 1
                      ? t.picks.from(formatRupiah(product.fromPrice))
                      : formatRupiah(product.fromPrice)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
