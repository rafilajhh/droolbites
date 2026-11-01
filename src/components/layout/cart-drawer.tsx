"use client";

import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowRight, X } from "lucide-react";
import { setCartQty, removeFromCart } from "@/app/actions/cart";
import { useLocale, useMessages } from "@/i18n/client";
import { commonMessages } from "@/i18n/messages/common";
import { variantLabel } from "@/content/products";
import { lineMeta } from "@/components/checkout/order-summary";
import { buttonClasses } from "@/components/ui/button";
import { OrderLine, SummaryRow } from "@/components/ui/order-bits";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { photoFrame } from "@/components/ui/snapshot";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Cart } from "@/lib/cart";
import { useModal, useShopUI } from "./shop-ui";

type Line = Cart["lines"][number];

/** Empty-cart shortcuts into the menu, tinted like the Our Story category tiles. */
const emptyPicks = [
  { key: "cookies", href: "/menu?category=soft-cookies", image: "/images/products/red-velvet.png", bg: "bg-tint-mustard" },
  { key: "brownies", href: "/menu/fudgy-brownies", image: "/images/products/fudgy-brownies.png", bg: "bg-tint-lavender" },
  { key: "tiramisu", href: "/menu?category=tiramisu", image: "/images/products/matcha-tiramisu.png", bg: "bg-tint-salmon" },
] as const;

/** pen: Cart drawer (wSMRO) → Cart Drawer (My6z7), 480px from the right. */
export function CartDrawer({ cart, deliveryFee }: { cart: Cart; deliveryFee: number }) {
  const t = useMessages(commonMessages).cart;
  const locale = useLocale();
  const { panel, close } = useShopUI();
  const isOpen = panel === "cart";
  const panelRef = useModal(isOpen, close);
  const [, startTransition] = useTransition();

  const [lines, applyQty] = useOptimistic(cart.lines, (current: Line[], change: { id: string; qty: number }) =>
    change.qty <= 0
      ? current.filter((l) => l.variantId !== change.id)
      : current.map((l) => (l.variantId === change.id ? { ...l, qty: change.qty, lineTotal: l.unitPrice * change.qty } : l)),
  );
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  const closeRef = useRef<HTMLButtonElement>(null);
  const removeRefs = useRef(new Map<string, HTMLButtonElement>());
  const [failed, setFailed] = useState(false);
  // The count/subtotal status is announced only after the shopper changes something.
  const [changed, setChanged] = useState(false);

  const changeQty = (id: string, qty: number) => {
    setFailed(false);
    setChanged(true);
    startTransition(async () => {
      applyQty({ id, qty });
      try {
        const result = await (qty <= 0 ? removeFromCart(id) : setCartQty(id, qty));
        if (!result.ok) setFailed(true);
      } catch {
        // The optimistic change reverts on its own when the transition ends.
        setFailed(true);
      }
    });
  };

  /** Removing a line moves focus to the next line's Remove, else the previous one, else the close button. */
  const removeLine = (id: string) => {
    const i = lines.findIndex((l) => l.variantId === id);
    const neighbour = lines[i + 1] ?? lines[i - 1];
    (neighbour ? removeRefs.current.get(neighbour.variantId) : closeRef.current)?.focus();
    changeQty(id, 0);
  };

  return (
    <div className={cn("fixed inset-0 z-50", !isOpen && "pointer-events-none")} inert={!isOpen}>
      <div
        className={cn("absolute inset-0 bg-ink/50 transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0")}
        onClick={close}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col bg-background transition-transform duration-300 ease-out",
          "motion-reduce:translate-x-0 motion-reduce:transition-opacity motion-reduce:duration-150",
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full motion-reduce:opacity-0",
        )}
      >
        <div className="flex w-full items-center justify-between px-5 pt-6 pb-5 shadow-[inset_0_-1px_0_var(--border-subtle)] sm:px-7 sm:pt-7">
          <div className="flex items-center gap-2.5">
            <h2 id="cart-title" className="font-display text-[30px] leading-[1.1] font-bold">
              {t.title}
            </h2>
            {count > 0 ? (
              <span className="rounded-pill bg-highlight px-2.5 py-1 text-xs leading-[1.2] font-bold">{t.items(count)}</span>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={t.close}
            className="relative flex size-10 items-center justify-center rounded-pill bg-oat after:absolute after:-inset-0.5 after:content-[''] transition-colors hover:bg-card-accent"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-y-auto px-5 py-8 sm:px-7 sm:py-10">
            <div className="flex flex-col items-start gap-4">
              <span className={cn(photoFrame, "mb-2 size-[112px] shrink-0 rounded-pill bg-oat")} aria-hidden>
                <Image src="/images/products/chocolate-chunk.png" alt="" fill sizes="112px" className="object-cover" />
              </span>
              <p className="font-display text-[28px] leading-[1.1] font-semibold">{t.emptyTitle}</p>
              <p className="max-w-[340px] text-base leading-normal text-muted-foreground">{t.emptyBody}</p>
              <Link href="/menu" onClick={close} className={buttonClasses("primary", "mt-2")}>
                {t.emptyCta}
              </Link>
            </div>
            <section aria-labelledby="cart-picks" className="flex flex-col gap-3">
              <h3 id="cart-picks" className="font-display text-[17px] leading-[21px] font-semibold text-foreground">
                {t.picksTitle}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {emptyPicks.map((pick) => (
                  <li key={pick.key}>
                    <Link
                      href={pick.href}
                      onClick={close}
                      className={cn(
                        "group/pick flex items-center gap-4 rounded-sm p-2.5 pr-4 inset-ring-1 inset-ring-transparent transition-shadow hover:inset-ring-border",
                        pick.bg,
                      )}
                    >
                      <span className={cn(photoFrame, "size-16 shrink-0 rounded-sm bg-oat")}>
                        <Image src={pick.image} alt="" fill sizes="64px" className="object-cover" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-display text-[17px] leading-[21px] font-semibold text-foreground">
                          {t.picks[pick.key].name}
                        </span>
                        <span className="text-[13px] leading-[18px] text-muted-foreground">{t.picks[pick.key].sub}</span>
                      </span>
                      <ArrowRight
                        className="size-[18px] shrink-0 text-foreground transition-transform duration-200 group-hover/pick:translate-x-0.5 motion-reduce:transition-none"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : (
          <>
            <ul className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-6 sm:px-7">
              {lines.map((line) => (
                <li
                  key={line.variantId}
                  className="flex w-full flex-col gap-2.5 pb-5 shadow-[inset_0_-1px_0_var(--border-subtle)]"
                >
                  <OrderLine
                    name={line.productName}
                    meta={lineMeta(line.qty, variantLabel(line.variantName, line.categorySlug, locale))}
                    price={formatRupiah(line.lineTotal)}
                    imageUrl={line.imageUrl}
                  />
                  <div className="flex w-full items-center justify-between pl-20">
                    <QuantityStepper
                      size="sm"
                      value={line.qty}
                      min={1}
                      onChange={(qty) => changeQty(line.variantId, qty)}
                      labels={{ decrease: t.decrease, increase: t.increase }}
                    />
                    <button
                      ref={(el) => {
                        if (el) removeRefs.current.set(line.variantId, el);
                        else removeRefs.current.delete(line.variantId);
                      }}
                      type="button"
                      onClick={() => removeLine(line.variantId)}
                      className="relative text-[13px] leading-normal font-semibold text-muted-foreground after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:text-foreground"
                    >
                      {t.remove}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex w-full flex-col gap-3.5 bg-card p-5 sm:p-7">
              {failed ? (
                <p role="alert" className="text-[13px] leading-normal font-semibold text-error">
                  {t.updateError}
                </p>
              ) : null}
              <SummaryRow
                label={t.subtotal}
                value={formatRupiah(subtotal)}
                labelClassName="text-lg font-bold text-foreground"
                valueClassName="text-xl"
              />
              <p className="text-[13px] leading-normal text-muted-foreground">{t.note(formatRupiah(deliveryFee))}</p>
              <Link href="/checkout" onClick={close} className={buttonClasses("primary", "w-full")}>
                {t.checkout}
              </Link>
              <button
                type="button"
                onClick={close}
                className="relative w-full text-center text-sm leading-normal font-semibold text-foreground after:absolute after:inset-x-0 after:-inset-y-3 after:content-[''] hover:text-primary"
              >
                {t.continue}
              </button>
            </div>
          </>
        )}
        <p role="status" className="sr-only">
          {changed ? t.status(count, formatRupiah(subtotal)) : ""}
        </p>
      </div>
    </div>
  );
}
