import { ButtonLink } from "@/components/ui/button";
import { policyMessages, type PolicyContact, type PolicyKey } from "@/i18n/messages/pages/policies";
import { getLocale, getMessages } from "@/i18n/server";
import { formatRupiah } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";
import { Eyebrow } from "./eyebrow";
import { formatOpeningHours } from "./hours";
import { PolicyToc } from "./policy-toc";

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
    hours: formatOpeningHours(settings, locale).replace("–", "\u2060–\u2060"),
    deliveryFee: formatRupiah(settings.deliveryFee),
  };

  return (
    <>
      <header className="flex w-full flex-col gap-4 px-4 pt-6 pb-10 shadow-[inset_0_-1px_0_var(--border-subtle)] sm:px-8 lg:px-16 lg:pt-14 lg:pb-12">
        <Eyebrow>{messages.eyebrow}</Eyebrow>
        <h1 className="max-w-[900px] font-display text-balance text-[44px] leading-[1.03] font-bold tracking-[-1px] text-foreground sm:text-[56px] lg:text-[72px] lg:leading-[73px] lg:tracking-[-2px]">
          {t.title}
        </h1>
        <p className="text-[17px] leading-[1.53] text-muted-foreground lg:text-[19px] lg:leading-[29px]">{t.sub}</p>
      </header>

      <div className="flex w-full flex-col gap-10 px-4 pt-10 pb-16 sm:px-8 lg:flex-row lg:gap-24 lg:px-16 lg:pt-14 lg:pb-28">
        <PolicyToc heading={messages.contents} items={t.sections.map(({ id, title }) => ({ id, title }))} />

        <div className="flex min-w-0 flex-1 flex-col gap-10">
          {t.sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="flex scroll-mt-8 flex-col gap-3 pb-10 shadow-[inset_0_-1px_0_var(--border-subtle)]"
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
            </section>
          ))}
          {"history" in t ? (
            <ButtonLink href="/account" className="w-fit">
              {t.history}
            </ButtonLink>
          ) : null}
        </div>
      </div>
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
