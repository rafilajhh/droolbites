import {
  Camera,
  Eraser,
  ListChecks,
  Lock,
  MessageCircle,
  RefreshCw,
  Store,
  Timer,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Chip, Sticker } from "@/components/ui/badges";
import { ArrowLink, ButtonLink } from "@/components/ui/button";
import { Snapshot } from "@/components/ui/snapshot";
import { policyMessages, type PolicyContact, type PolicyKey } from "@/i18n/messages/pages/policies";
import { getLocale, getMessages } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { formatDate, formatRupiah } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";
import { Eyebrow } from "./eyebrow";
import { formatOpeningHours, halfHourBefore } from "./hours";
import { PolicyHelp } from "./policy-help";
import { PolicyToc } from "./policy-toc";

const policyHref: Record<PolicyKey, string> = {
  shipping: "/shipping-policy",
  returns: "/returns-refunds",
  privacy: "/privacy-policy",
};

/** Icon and tint of each "at a glance" panel, in the order of the copy. */
const glanceStyle: Record<PolicyKey, { icon: LucideIcon; fill: string }[]> = {
  shipping: [
    { icon: Truck, fill: "bg-tint-mustard" },
    { icon: Store, fill: "bg-tint-lime" },
    { icon: MessageCircle, fill: "bg-tint-lavender" },
  ],
  returns: [
    { icon: Timer, fill: "bg-tint-salmon" },
    { icon: RefreshCw, fill: "bg-tint-mustard" },
    { icon: Wallet, fill: "bg-tint-lime" },
  ],
  privacy: [
    { icon: ListChecks, fill: "bg-tint-lavender" },
    { icon: Lock, fill: "bg-tint-lime" },
    { icon: Eraser, fill: "bg-tint-mustard" },
  ],
};

/** Photo pinned beside the reading column on wide screens. */
const asidePhoto: Record<PolicyKey, string> = {
  shipping: "/images/products/fudgy-brownies.png",
  returns: "/images/products/double-chocolate.png",
  privacy: "/images/products/red-velvet.png",
};

/** Same numbered discs as the home "Three steps" cards. */
const stepStyle = [
  { icon: Camera, fill: "bg-accent-mustard" },
  { icon: MessageCircle, fill: "bg-accent-teal" },
  { icon: RefreshCw, fill: "bg-accent-lavender" },
];

const px = "px-4 sm:px-8 lg:px-16";

/** When the policy text last changed: the <time> value and, formatted per language, the visible date. */
const UPDATED_ISO = "2026-10-29";

export async function policyMetadata(key: PolicyKey) {
  const t = await getMessages(policyMessages);
  return { title: t[key].title, description: t[key].metaDescription };
}

/** Shared layout of the three policy frames (MInKs, T4tsh, C9zhg6). */
export async function PolicyPage({ policy }: { policy: PolicyKey }) {
  const [messages, locale, settings] = await Promise.all([getMessages(policyMessages), getLocale(), getStoreSettings()]);
  const t = messages[policy];
  const contact: PolicyContact = {
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    // Word joiners keep "10:00–21:00" on one line.
    hours: formatOpeningHours(settings, locale).replace("–", "⁠–⁠"),
    deliveryFee: formatRupiah(settings.deliveryFee),
    opensAt: settings.opensAt,
    pickupCutoff: halfHourBefore(settings),
  };
  const glance = t.glance(contact);

  return (
    <>
      <header
        className={cn(
          "flex w-full flex-col gap-4 pt-6 pb-10 shadow-[inset_0_-1px_0_var(--border-subtle)] lg:pt-14 lg:pb-12",
          px,
        )}
      >
        <Eyebrow>{messages.eyebrow}</Eyebrow>
        <h1 className="max-w-[900px] font-display text-balance text-[44px] leading-[1.03] font-bold tracking-[-1px] text-foreground sm:text-[56px] lg:text-[72px] lg:leading-[73px] lg:tracking-[-2px]">
          {t.title}
        </h1>
        <p className="text-[17px] leading-[1.53] text-muted-foreground lg:text-[19px] lg:leading-[29px]">{t.sub}</p>
        <Chip className="mt-1">
          <time dateTime={UPDATED_ISO}>
            {messages.updated(formatDate(new Date(`${UPDATED_ISO}T12:00:00+07:00`), locale))}
          </time>
        </Chip>
      </header>

      <section aria-labelledby="policy-glance" className={cn("w-full pt-8 lg:pt-12", px)}>
        <h2 id="policy-glance" className="sr-only">
          {messages.glance}
        </h2>
        <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-6">
          {glance.map((item, i) => {
            const Icon = glanceStyle[policy][i].icon;
            return (
              <li
                key={item.title}
                className={cn(
                  "flex items-start gap-4 rounded-m p-5 sm:flex-col sm:gap-5 lg:p-7",
                  glanceStyle[policy][i].fill,
                )}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-background">
                  <Icon className="size-[22px] text-foreground" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="font-display text-[22px] leading-[26px] font-bold text-foreground lg:text-[24px] lg:leading-[29px]">
                    {item.title}
                  </h3>
                  <p className="text-pretty text-[15px] leading-[23px] text-muted-foreground">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {"steps" in t ? (
        <section aria-labelledby="policy-steps" className={cn("flex w-full flex-col gap-6 pt-12 lg:gap-8 lg:pt-16", px)}>
          <h2
            id="policy-steps"
            className="font-display text-balance text-[30px] leading-[33px] font-bold tracking-[-0.5px] text-foreground lg:text-[40px] lg:leading-[44px] lg:tracking-[-1px]"
          >
            {t.steps.title}
          </h2>
          <ol className="grid w-full grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
            {t.steps.items.map((step, i) => {
              const Icon = stepStyle[i].icon;
              return (
                <li key={step.title} className="flex flex-col gap-4 rounded-m bg-card p-6 lg:gap-5 lg:p-8">
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={cn(
                        "flex size-12 items-center justify-center rounded-pill font-display text-[22px] leading-none font-bold text-ink lg:size-14 lg:text-[26px]",
                        stepStyle[i].fill,
                      )}
                    >
                      {i + 1}
                    </span>
                    <Icon className="size-7 text-foreground" aria-hidden />
                  </div>
                  <h3 className="font-display text-[22px] leading-[26px] font-bold text-foreground lg:text-[24px] lg:leading-[28px]">
                    {step.title}
                  </h3>
                  <p className="text-pretty text-base leading-normal text-muted-foreground">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <div className={cn("flex w-full flex-col gap-10 pt-10 pb-12 lg:flex-row lg:gap-24 lg:pt-14 lg:pb-20", px)}>
        <PolicyToc heading={messages.contents} items={t.sections.map(({ id, title }) => ({ id, title }))} />

        {/* The photo only joins once the column is wide enough to keep the 35em reading measure beside it. */}
        <div className="@container flex min-w-0 flex-1">
          <div className="flex w-full gap-16">
            <div className="flex min-w-0 flex-1 flex-col gap-10">
              {t.sections.map((section, i) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-title`}
                  className="flex scroll-mt-[88px] flex-col gap-3 pb-10 shadow-[inset_0_-1px_0_var(--border-subtle)]"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-card text-[13px] leading-none font-bold text-foreground">
                      {i + 1}
                    </span>
                    <h2
                      id={`${section.id}-title`}
                      className="font-display text-2xl leading-[1.1] font-bold text-foreground lg:text-[30px] lg:leading-[33px]"
                    >
                      {section.title}
                    </h2>
                  </div>
                  <p className="max-w-[35em] text-pretty text-[17px] leading-[28px] text-muted-foreground">
                    {withContactLinks(section.body(contact), contact)}
                  </p>
                  {"link" in section ? (
                    <ArrowLink href={section.link.href} className="mt-2 w-fit">
                      {section.link.label}
                    </ArrowLink>
                  ) : null}
                </section>
              ))}
              {"history" in t ? (
                <ButtonLink href="/account" className="w-fit">
                  {t.history}
                </ButtonLink>
              ) : null}
            </div>

            <div className="sticky top-[88px] hidden w-[240px] shrink-0 self-start pt-2 pb-6 @min-[900px]:block" aria-hidden>
              <Snapshot src={asidePhoto[policy]} alt="" sizes="240px" className="aspect-[4/5] w-full" />
              <Sticker className="absolute -bottom-1 -left-5">{t.sticker}</Sticker>
            </div>
          </div>
        </div>
      </div>

      <PolicyHelp
        copy={messages.help}
        email={settings.email}
        phone={settings.phone}
        hours={contact.hours}
        links={[
          ...(Object.keys(policyHref) as PolicyKey[])
            .filter((key) => key !== policy)
            .map((key) => ({ href: policyHref[key], label: messages[key].title })),
          { href: "/faq", label: messages.help.faq },
        ]}
      />
    </>
  );
}

/** Turns the store email and phone quoted in a policy paragraph into mailto:/tel: links that never wrap. */
function withContactLinks(text: string, contact: PolicyContact) {
  const links = [
    { value: contact.email, href: `mailto:${contact.email}` },
    { value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, "")}` },
  ];
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${links.map((l) => escape(l.value)).join("|")})`);
  return text.split(pattern).map((part, i) => {
    const link = links.find((l) => l.value === part);
    return link ? (
      <a
        key={i}
        href={link.href}
        className="font-semibold whitespace-nowrap text-foreground underline underline-offset-4 hover:no-underline"
      >
        {part}
      </a>
    ) : (
      part
    );
  });
}
