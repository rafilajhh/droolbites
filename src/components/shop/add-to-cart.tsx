"use client";

import { useCallback, useState } from "react";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { cn } from "@/lib/cn";
import type { ShopProduct } from "./shop-product";
import { SizeModal } from "./size-modal";
import { useAddToCart } from "./use-add-to-cart";

/**
 * The round 40px "+" on Card/Menu Item. Single-variant products go straight to
 * the cart; products with several sizes open the size picker (kfcyP) instead.
 */
export function AddButton({ product, className }: { product: ShopProduct; className?: string }) {
  const t = useMessages(menuMessages).card;
  const { add, pending, failed } = useAddToCart();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const multi = product.variants.length > 1;

  return (
    <>
      <span className="relative flex shrink-0">
        <button
          type="button"
          // aria-disabled instead of disabled keeps focus on the button while adding; the hook ignores clicks meanwhile.
          onClick={() => (multi ? setOpen(true) : add(product.variants[0].id, 1))}
          aria-disabled={pending || undefined}
          aria-label={multi ? t.chooseSize(product.name) : t.add(product.name)}
          aria-haspopup={multi ? "dialog" : undefined}
          aria-busy={pending || undefined}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-pill bg-primary text-primary-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-primary-hover active:scale-90 aria-disabled:cursor-wait aria-disabled:opacity-70 motion-reduce:active:scale-100",
            failed && "bg-error!",
            className,
          )}
        >
          {pending ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : multi ? (
            <ChevronRight className="size-5" aria-hidden />
          ) : (
            <Plus className="size-5" aria-hidden />
          )}
        </button>
        {/* Positioned over the card so its layout does not shift. */}
        <span role="status" className="pointer-events-none absolute right-0 bottom-full z-10 mb-2">
          {failed ? (
            <span className="block rounded-pill bg-error px-3 py-1.5 text-xs leading-[16px] font-semibold whitespace-nowrap text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--ink)_15%,transparent)]">
              {t.errorShort}
            </span>
          ) : null}
        </span>
      </span>
      {multi ? <SizeModal product={product} open={open} onClose={close} /> : null}
    </>
  );
}

/** Any button that opens the size picker, e.g. "CHOOSE A SIZE" on the landing page. */
export function SizePickerButton({
  product,
  className,
  children,
}: {
  product: ShopProduct;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}>
        {children}
      </button>
      <SizeModal product={product} open={open} onClose={close} />
    </>
  );
}
