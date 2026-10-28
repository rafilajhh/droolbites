"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PaymentOption } from "@/components/ui/choice-tiles";
import type { PaymentMethod } from "@/generated/prisma/enums";
import type { CheckoutMessages } from "@/i18n/messages/checkout";
import { cn } from "@/lib/cn";
import { PAYMENT_GROUPS, PRIMARY_VA_COUNT, paymentMethodInfo } from "@/lib/order-status";

export type PaymentLogos = Partial<Record<PaymentMethod, string>>;

/**
 * The E-wallet / QRIS / Virtual account / Retail cards with their radio tiles.
 * `methods` is what the server allows right now (store settings + gateway
 * channels); a group without any of them is left out. Banks past the pen's four
 * stay folded until asked for, or while one of them is selected.
 */
export function PaymentMethodGroups({
  t,
  methods,
  logos,
  selected,
  onSelect,
  className,
}: {
  t: CheckoutMessages["payment"];
  methods: readonly PaymentMethod[];
  logos: PaymentLogos;
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  className?: string;
}) {
  const groups = PAYMENT_GROUPS.map((g) => ({ key: g.key, methods: g.methods.filter((m) => methods.includes(m)) })).filter(
    (g) => g.methods.length > 0,
  );
  const extraBanks = groups.find((g) => g.key === "va")?.methods.slice(PRIMARY_VA_COUNT) ?? [];
  const [showMore, setShowMore] = useState(() => selected !== null && extraBanks.includes(selected));

  return (
    <div className={cn("flex w-full flex-col gap-5", className)}>
      {groups.map((group) => {
        const labels = t.groups[group.key];
        const titleId = `pay-group-${group.key}`;
        const folds = group.key === "va" && extraBanks.length > 0;
        const shown = folds && !showMore ? group.methods.slice(0, PRIMARY_VA_COUNT) : group.methods;
        return (
          <div
            key={group.key}
            role="radiogroup"
            aria-labelledby={titleId}
            className="flex w-full flex-col gap-3 rounded-m bg-white p-5 inset-ring-1 inset-ring-border-subtle sm:p-7"
          >
            <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 pb-1">
              <h2 id={titleId} className="font-display text-[22px] leading-[25px] font-bold text-foreground">
                {labels.title}
              </h2>
              <p className="text-[13px] leading-5 text-muted-foreground">{labels.sub}</p>
            </div>
            <div id={`${titleId}-options`} className="grid w-full gap-3 sm:grid-cols-2">
              {shown.map((method) => {
                const info = paymentMethodInfo[method];
                return (
                  <PaymentOption
                    key={method}
                    name="method"
                    value={method}
                    checked={selected === method}
                    onChange={() => onSelect(method)}
                    markLabel={info.mark}
                    markClassName={info.markClass}
                    logoUrl={logos[method]}
                    title={<span className="block leading-5">{info.name}</span>}
                    sub={<span className="block leading-[18px]">{t.hints[method]}</span>}
                  />
                );
              })}
            </div>
            {folds ? (
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                aria-expanded={showMore}
                aria-controls={`${titleId}-options`}
                className="flex min-h-11 w-fit items-center gap-1.5 self-center rounded-pill px-4 text-sm leading-[21px] font-semibold text-primary transition-colors hover:bg-background"
              >
                {showMore ? t.fewerBanks : t.moreBanks(extraBanks.length)}
                <ChevronDown
                  className={cn("size-4 transition-transform duration-200 motion-reduce:transition-none", showMore && "rotate-180")}
                  aria-hidden
                />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
