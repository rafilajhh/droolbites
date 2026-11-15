import { OrderLine, SummaryRow } from "@/components/ui/order-bits";
import type { CheckoutMessages } from "@/i18n/messages/checkout";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";

export type SummaryLine = {
  key: string;
  name: string;
  /** Quantity and variant line, e.g. "1 portion", "2 × 10 × 10 cm · 1 tray". */
  meta: string;
  lineTotal: number;
  imageUrl: string | null;
};

/**
 * The variant line under a summary line: "1 portion", "2 × 1 piece", "2 × 10 × 10 cm · 1 tray". Summaries
 * have no quantity stepper, so every line states its quantity and unit (and all rows share one height).
 */
export function lineMeta(qty: number, label: string) {
  return qty > 1 ? `${qty} × ${label}` : label;
}

/**
 * pen: Order Summary (aKtPB). Pure markup (no hooks) so both server pages and
 * the client checkout forms can render it.
 */
export function OrderSummary({
  id,
  t,
  lines,
  itemCount,
  subtotal,
  fulfilment,
  fee,
  serviceFee = 0,
  total,
  className,
}: {
  t: CheckoutMessages["summary"];
  lines: SummaryLine[];
  itemCount: number;
  subtotal: number;
  fulfilment: "delivery" | "pickup";
  /** null while the delivery pin isn't placed yet: the row asks for it instead of a price. */
  fee: number | null;
  /** Payment service fee the customer pays on top (only when the gateway charges it to the customer). */
  serviceFee?: number;
  total: number;
  className?: string;
  /** Optional id, e.g. for a toggle button's aria-controls. */
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby="order-summary-title"
      className={cn("flex w-full flex-col gap-5 rounded-m bg-card p-5 sm:p-7", className)}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <h2 id="order-summary-title" className="font-display text-[22px] leading-7 font-bold text-foreground">
          {t.title}
        </h2>
        <span className="font-mono text-[13px] leading-5 font-semibold text-muted-foreground">{t.items(itemCount)}</span>
      </div>
      <ul className="flex w-full flex-col gap-3.5">
        {lines.map((line) => (
          <li key={line.key}>
            <OrderLine
              name={line.name}
              meta={line.meta}
              price={formatRupiah(line.lineTotal)}
              imageUrl={line.imageUrl}
              thumb={52}
              nameClassName="text-[15px]! leading-[19px]!"
              priceClassName="text-sm! leading-[21px]!"
            />
          </li>
        ))}
      </ul>
      <div className="flex w-full flex-col gap-2.5 pt-5 shadow-[inset_0_1px_0_var(--border-divider)]">
        <SummaryRow
          label={t.subtotal}
          value={formatRupiah(subtotal)}
          labelClassName="leading-[23px]!"
          valueClassName="leading-[23px]!"
        />
        <SummaryRow
          label={fulfilment === "delivery" ? t.delivery : t.pickup}
          value={fee === null ? t.pinFirst : fee > 0 ? formatRupiah(fee) : t.free}
          labelClassName="leading-[23px]!"
          valueClassName={cn("leading-[23px]!", fee === null && "font-normal text-muted-foreground")}
        />
        {serviceFee > 0 ? (
          <SummaryRow
            label={t.serviceFee}
            value={formatRupiah(serviceFee)}
            labelClassName="leading-[23px]!"
            valueClassName="leading-[23px]!"
          />
        ) : null}
        <div className="flex w-full items-end justify-between pt-2.5">
          <span className="font-display text-xl leading-[30px] font-bold text-foreground">{t.total}</span>
          <span className="font-display text-[28px] leading-[31px] font-bold text-foreground">{formatRupiah(total)}</span>
        </div>
      </div>
    </section>
  );
}
