import { Chip } from "@/components/ui/badges";
import { ArrowLink, ButtonLink } from "@/components/ui/button";
import { policyMessages, type PolicyContact, type PolicyKey } from "@/i18n/messages/pages/policies";
import { getLocale, getMessages } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { formatDate, formatRupiah } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";
import { Eyebrow } from "./eyebrow";
import { formatOpeningHours, halfHourBefore } from "./hours";
import { PolicyHelp } from "./policy-help";
import { PolicyToc } from "./policy-toc";

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

  return (
    <>
      <header
        className={cn(
          "flex w-full flex-col gap-4 pt-6 pb-8 shadow-[inset_0_-1px_0_var(--border-subtle)] lg:pt-12 lg:pb-10",
          px,
        )}
      >
        <Eyebrow>{messages.eyebrow}</Eyebrow>
        <h1 className="type-page max-w-[900px] font-display text-balance font-bold text-foreground">
          {t.title}
        </h1>
        <p className="text-balance text-[17px] leading-[1.53] text-muted-foreground lg:text-[19px] lg:leading-[29px]">{t.sub}</p>
        <Chip className="mt-1">
          <time dateTime={UPDATED_ISO}>
            {messages.updated(formatDate(new Date(`${UPDATED_ISO}T12:00:00+07:00`), locale))}
          </time>
        </Chip>
      </header>

      <div className={cn("section-y flex w-full flex-col gap-8 lg:flex-row lg:gap-20", px)}>
        <PolicyToc heading={messages.contents} items={t.sections.map(({ id, title }) => ({ id, title }))} />

        <div className="flex min-w-0 flex-1 flex-col gap-8 lg:gap-10">
          {t.sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="flex max-w-[35em] scroll-mt-[88px] flex-col gap-3 pb-8 shadow-[inset_0_-1px_0_var(--border-subtle)] lg:pb-10"
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
      </div>

      <PolicyHelp copy={policy === "privacy" ? { ...messages.help, ...messages.privacyHelp } : messages.help} email={settings.email} phone={settings.phone} />
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
