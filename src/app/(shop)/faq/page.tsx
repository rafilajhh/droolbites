import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import { Eyebrow } from "@/components/content/eyebrow";
import { formatOpeningHours } from "@/components/content/hours";
import { AccordionItem } from "@/components/ui/accordion";
import { faqMessages, type FaqFacts } from "@/i18n/messages/pages/faq";
import { getLocale, getMessages } from "@/i18n/server";
import { formatRupiah } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(faqMessages);
  return { title: t.metaTitle, description: t.metaDescription };
}

const contactLink = "flex w-fit items-center gap-2.5 text-[15px] leading-[23px] font-semibold text-foreground-inverse hover:underline";

/** pen: FAQ (ouetk). */
export default async function FaqPage() {
  const [t, locale, settings] = await Promise.all([getMessages(faqMessages), getLocale(), getStoreSettings()]);

  const methods: string[] = [];
  if (settings.vaEnabled) methods.push(t.payments.va);
  if (settings.qrisEnabled) methods.push(t.payments.qris);
  if (settings.ewalletEnabled) methods.push(t.payments.ewallet);
  const payments =
    methods.length > 1 ? `${methods.slice(0, -1).join(", ")} ${t.payments.or} ${methods.at(-1)}` : (methods[0] ?? "");

  const facts: FaqFacts = {
    address: settings.address,
    hours: formatOpeningHours(settings, locale),
    deliveryFee: formatRupiah(settings.deliveryFee),
    email: settings.email,
    payments,
  };

  return (
    <section className="flex w-full flex-col gap-12 px-4 pt-6 pb-16 sm:px-8 lg:flex-row lg:gap-24 lg:px-16 lg:pt-14 lg:pb-28">
      <div className="flex w-full flex-col gap-5 lg:w-[400px] lg:shrink-0">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h1 className="font-display text-[44px] leading-[1.03] font-bold tracking-[-1px] text-foreground lg:text-[64px] lg:leading-[65px] lg:tracking-[-2px]">
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
                questionClassName="leading-[28px]"
              >
                {item.a(facts)}
              </AccordionItem>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
