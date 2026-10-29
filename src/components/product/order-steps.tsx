import { ShoppingBag, Truck, Wallet } from "lucide-react";
import { formatOpenDays, halfHourBefore } from "@/components/content/hours";
import { getLocale, getMessages } from "@/i18n/server";
import { menuMessages } from "@/i18n/messages/menu";
import { formatRupiah } from "@/lib/format";
import { paymentMethodInfo } from "@/lib/order-status";
import { getPaymentOptions } from "@/lib/payments";
import { getStoreSettings } from "@/lib/settings";

const icons = [ShoppingBag, Truck, Wallet];

/**
 * Closing strip before the footer on the menu and product pages: the three ordering steps
 * on a mustard tint. Deliberately not cards, so it reads apart from the review panels.
 * Its height also keeps the menu's promo-tile cookie and the footer cookies out of one screen.
 */
export async function OrderSteps() {
  const [m, locale, settings] = await Promise.all([getMessages(menuMessages), getLocale(), getStoreSettings()]);
  const { methods } = await getPaymentOptions(settings);
  const kinds = new Set(methods.map((method) => paymentMethodInfo[method].kind));
  const wallets = methods.filter((method) => paymentMethodInfo[method].kind === "ewallet").map((method) => paymentMethodInfo[method].name);
  const t = m.steps;
  const [pick, deliver, pay] = t.items;
  const fulfilment = {
    fee: formatRupiah(settings.deliveryFee),
    cutoff: halfHourBefore(settings),
    delivery: settings.deliveryEnabled,
    pickup: settings.pickupEnabled,
  };
  const steps = [
    { title: pick.title, body: pick.body },
    { title: deliver.title(fulfilment), body: deliver.body(fulfilment) },
    {
      title: pay.title,
      body: pay.body({
        qris: kinds.has("qris"),
        va: kinds.has("va"),
        retail: kinds.has("retail"),
        ewallet: wallets.length ? wallets.join(", ") : undefined,
      }),
    },
  ];
  const tel = `tel:${settings.phone.replace(/\s/g, "")}`;

  return (
    <section aria-labelledby="order-steps" className="w-full px-3 pb-16 sm:px-6 lg:pb-28">
      <div className="flex w-full flex-col gap-10 rounded-m bg-tint-mustard px-5 py-10 sm:px-10 lg:gap-12 lg:px-16 lg:py-16">
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <h2
            id="order-steps"
            className="font-display text-[32px] leading-[35px] font-bold tracking-[-1px] text-balance text-foreground lg:text-[44px] lg:leading-[46px]"
          >
            {t.title}
          </h2>
          <p className="max-w-[420px] text-pretty text-base leading-[24px] text-foreground">{t.sub(settings.opensAt, formatOpenDays(settings, locale))}</p>
        </div>
        <ol className="grid w-full grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
          {steps.map((step, i) => {
            const Icon = icons[i];
            return (
              <li key={step.title} className="flex flex-col items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-white" aria-hidden>
                  <Icon className="size-6 text-ink" />
                </span>
                <h3 className="font-display text-[22px] leading-[26px] font-bold text-foreground">{step.title}</h3>
                <p className="max-w-[360px] text-pretty text-[15px] leading-[23px] text-foreground">{step.body}</p>
              </li>
            );
          })}
        </ol>
        <p className="w-full pt-6 text-pretty text-[15px] leading-[23px] text-foreground shadow-[inset_0_1px_0_var(--border-divider)]">
          {t.help}{" "}
          <a
            href={tel}
            className="relative font-semibold whitespace-nowrap underline underline-offset-4 after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[''] hover:no-underline"
          >
            {settings.phone}
          </a>
          {t.helpAfter}
        </p>
      </div>
    </section>
  );
}
