import { Clock } from "lucide-react";
import type { CheckoutMessages } from "@/i18n/messages/checkout";
import type { StoreClosed } from "@/lib/store-hours";

/**
 * Outside the store's ordering hours: when orders open again, on the details and payment steps (whose
 * buttons are disabled meanwhile). Pure markup so the client checkout forms can render it.
 */
export function ClosedNotice({ id, t, closed }: { id: string; t: CheckoutMessages["closed"]; closed: StoreClosed }) {
  const r = closed.reopens;
  const when = !r ? null : r.inDays === 0 ? t.today(r.time) : r.inDays === 1 ? t.tomorrow(r.time, t.days[r.day]) : t.later(r.time, t.days[r.day]);
  return (
    <div id={id} className="flex w-full items-start gap-3 rounded-sm bg-tint-mustard p-4 text-[15px] leading-normal text-foreground">
      <Clock className="mt-0.5 size-5 shrink-0 text-foreground" aria-hidden />
      <p className="flex-1 text-pretty">
        <span className="font-bold">{t.title}.</span> {when ? t.body(when, closed.opens, closed.closes, closed.lastOrder) : t.never}
      </p>
    </div>
  );
}
