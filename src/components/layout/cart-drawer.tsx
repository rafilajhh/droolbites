"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowRight, Trash2, X } from "lucide-react";
import { setCartQty, removeFromCart } from "@/app/actions/cart";
import { useMessages } from "@/i18n/client";
import { commonMessages } from "@/i18n/messages/common";
import { isTrayCategory } from "@/content/products";
import { buttonClasses } from "@/components/ui/button";
import { SummaryRow } from "@/components/ui/order-bits";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { StockBadge } from "@/components/shop/stock";
import { LOW_STOCK } from "@/lib/stock";
import { photoFrame } from "@/components/ui/snapshot";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Cart } from "@/lib/cart";
import { useModal, useShopUI } from "./shop-ui";

type Line = Cart["lines"][number];

/**
 * Single-variant products (cookies, tiramisu) carry only "1 piece"/"1 portion": the stepper
 * already says how many, so their line shows no variant.
 */
const singleUnit = /^1 (piece|portion)$/;

/** pen: Cart drawer (wSMRO) → Cart Drawer (My6z7), 480px from the right. */
export function CartDrawer({ cart, deliveryFee }: { cart: Cart; deliveryFee: number }) {
  const t = useMessages(commonMessages).cart;
  const { panel, open, close } = useShopUI();
  const isOpen = panel === "cart";

  // Checkout sends a shopper whose cart ran short to /menu?cart=open: open the drawer on the marked lines.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("cart") !== "open") return;
    url.searchParams.delete("cart");
    window.history.replaceState(window.history.state, "", url);
    open("cart");
  }, [open]);
  const panelRef = useModal(isOpen, close);
  const [, startTransition] = useTransition();

  const [lines, applyQty] = useOptimistic(cart.lines, (current: Line[], change: { id: string; qty: number }) =>
    change.qty <= 0
      ? current.filter((l) => l.variantId !== change.id)
      : current.map((l) => (l.variantId === change.id ? { ...l, qty: change.qty, lineTotal: l.unitPrice * change.qty } : l)),
  );
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const anyShort = lines.some((l) => l.stock !== null && l.qty > l.stock);
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
          // On a short screen (a phone on its side, 200% zoom) the fixed header and footer would leave the
          // list less than one row, so the whole panel scrolls instead: the list first, then the footer.
          "[@media(max-height:500px)]:overflow-y-auto",
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
          // One message and one way on: the menu.
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-5 pt-10 pb-20 text-center sm:px-7">
            <span className={cn(photoFrame, "mb-3 size-24 shrink-0 rounded-pill bg-oat")} aria-hidden>
              <Image src="/images/products/chocolate-chunk.png" alt="" fill sizes="96px" className="object-cover" />
            </span>
            <p className="font-display text-2xl leading-[29px] font-semibold text-foreground">{t.emptyTitle}</p>
            <p className="max-w-[300px] text-[15px] leading-[23px] text-pretty text-muted-foreground">{t.emptyBody}</p>
            <Link href="/menu" onClick={close} className={buttonClasses("primary", "mt-3")}>
              {t.emptyCta}
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-1 sm:px-7 [@media(max-height:500px)]:flex-none [@media(max-height:500px)]:overflow-visible">
              {lines.map((line) => {
                // One-size products (cookies, tiramisu) need no size line; the unit price shows once there are several.
                // Just the size ("15 × 15 cm"): the "1 tray" of the order label would contradict a quantity of 2.
                const meta = [
                  singleUnit.test(line.variantName) ? null : line.variantName,
                  line.qty > 1
                    ? t.each(
                        formatRupiah(line.unitPrice),
                        isTrayCategory(line.categorySlug) ? "tray" : line.variantName === "1 portion" ? "portion" : "piece",
                      )
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                const stock = line.stock === null ? null : Math.max(line.stock, 0);
                const short = stock !== null && line.qty > stock;
                return (
                  <li key={line.variantId} className="flex w-full gap-4 py-5 shadow-[inset_0_-1px_0_var(--border-subtle)] last:shadow-none">
                    <div className={cn(photoFrame, "size-[72px] shrink-0 rounded-sm bg-oat")}>
                      {line.imageUrl ? (
                        <Image src={line.imageUrl} alt="" fill sizes="72px" quality={100} className="object-cover" />
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                      <div className="flex w-full items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p className="font-display text-[17px] leading-[21px] font-semibold text-foreground">{line.productName}</p>
                          {meta ? <p className="text-[13px] leading-[18px] text-muted-foreground">{meta}</p> : null}
                          {short ? (
                            <p className="text-[13px] leading-[18px] font-semibold text-error">
                              {stock === 0 ? t.soldOut : t.short(stock)}
                            </p>
                          ) : stock !== null && line.qty === stock ? (
                            <p className="text-[13px] leading-[18px] text-muted-foreground">{t.last(stock)}</p>
                          ) : stock !== null && stock <= LOW_STOCK ? (
                            <StockBadge left={stock} className="mt-1" />
                          ) : null}
                        </div>
                        <p className="shrink-0 text-[15px] leading-[21px] font-bold text-foreground tabular-nums">
                          {formatRupiah(line.lineTotal)}
                        </p>
                      </div>
                      <div className="flex w-full items-center justify-between gap-3">
                        <QuantityStepper
                          size="sm"
                          value={line.qty}
                          min={1}
                          // A tracked size stops at what's left (a line already over it can only go down).
                          max={stock === null ? 99 : Math.min(99, Math.max(stock, 1))}
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
                          aria-label={t.remove(line.productName)}
                          title={t.remove(line.productName)}
                          className="relative -mr-1.5 flex size-8 items-center justify-center rounded-pill text-muted-foreground transition-colors after:absolute after:-inset-1.5 after:content-[''] hover:bg-oat hover:text-foreground"
                        >
                          <Trash2 className="size-[18px]" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Flat on the paper under a hairline: the subtotal, one delivery line and the way on. */}
            <div className="flex w-full flex-col gap-4 px-5 pt-5 pb-6 shadow-[inset_0_1px_0_var(--border-subtle)] sm:px-7 sm:pb-7">
              {failed ? (
                <p role="alert" className="text-[13px] leading-normal font-semibold text-error">
                  {t.updateError}
                </p>
              ) : anyShort ? (
                <p className="text-[13px] leading-normal font-semibold text-error">{t.fixFirst}</p>
              ) : null}
              <div className="flex flex-col gap-1">
                <SummaryRow
                  label={t.subtotal}
                  value={formatRupiah(subtotal)}
                  labelClassName="text-base leading-6 font-semibold text-foreground"
                  valueClassName="font-display text-[22px] leading-7 tabular-nums"
                />
                <p className="text-[13px] leading-5 text-pretty text-muted-foreground">{t.note(formatRupiah(deliveryFee))}</p>
              </div>
              <Link href="/checkout" onClick={close} className={buttonClasses("primary", "w-full")}>
                {t.checkout}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={close}
                className="relative w-full text-center text-sm leading-[21px] font-semibold text-foreground after:absolute after:inset-x-0 after:-inset-y-3 after:content-[''] hover:text-primary"
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
