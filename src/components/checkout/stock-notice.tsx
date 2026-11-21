import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import type { ShortItem } from "@/app/actions/checkout";
import type { CheckoutMessages } from "@/i18n/messages/checkout";

/**
 * The cart asks for more than is left: the lines short (as the cart drawer marks them) and the way back to the
 * drawer, on the details and payment steps (whose buttons are disabled meanwhile). Pure markup so the client
 * checkout forms can render it.
 */
export function StockNotice({ id, t, short }: { id: string; t: CheckoutMessages["stock"]; short: ShortItem[] }) {
  return (
    <div id={id} className="flex w-full items-start gap-3 rounded-sm bg-tint-salmon p-4 text-[15px] leading-normal text-foreground">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-foreground" aria-hidden />
      <p className="flex-1 text-pretty">
        <span className="font-bold">{t.notice}</span>{" "}
        {short.map((item) => (item.left === 0 ? t.soldOut(item.name) : t.left(item.name, item.left))).join(", ")}.{" "}
        {/* The menu opens the cart drawer, where those lines are marked. */}
        <Link href="/menu?cart=open" className="font-bold underline">
          {t.fix}
        </Link>
      </p>
    </div>
  );
}
