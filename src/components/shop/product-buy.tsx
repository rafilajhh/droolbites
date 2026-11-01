"use client";

import { useEffect, useRef, useState } from "react";
import { Star, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptionTile } from "@/components/ui/choice-tiles";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useMessages } from "@/i18n/client";
import { productMessages } from "@/i18n/messages/product";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import type { ShopProduct } from "./shop-product";
import { useAddToCart } from "./use-add-to-cart";

/**
 * Product detail head + Buy box (w7mQL): price, quantity stepper and
 * "ADD TO CART · Rp…" (follows qty and size). Products with several sizes
 * get a size picker inside the box. Below lg a bar pinned to the bottom of the
 * screen repeats the price and Add button while the box's own button is out of view.
 */
export function ProductBuy({
  product,
  eyebrow,
  description,
  unit,
  rating,
  deliveryFee,
  pickup,
}: {
  product: ShopProduct;
  eyebrow: string;
  description: string;
  unit: string;
  /** Illustrative rating, already formatted for the locale; links to the reviews further down. */
  rating?: { value: string; count: number };
  /** Formatted delivery fee from the store settings; null when delivery is off. */
  deliveryFee: string | null;
  pickup: boolean;
}) {
  const t = useMessages(productMessages);
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [qty, setQty] = useState(1);
  const { add, pending, failed } = useAddToCart();
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const multi = product.variants.length > 1;

  // The pinned bar shows while the in-box Add row is off screen, and hides once the page's end
  // spacer (rendered by the product page, below the related products) scrolls in, so it never
  // covers the footer or the newsletter form.
  const addRowRef = useRef<HTMLDivElement>(null);
  const [addRowVisible, setAddRowVisible] = useState(true);
  const [endVisible, setEndVisible] = useState(false);
  useEffect(() => {
    const row = addRowRef.current;
    const end = document.querySelector("[data-buy-bar-end]");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === row) setAddRowVisible(entry.isIntersecting);
        else setEndVisible(entry.isIntersecting);
      }
    });
    if (row) observer.observe(row);
    if (end) observer.observe(end);
    return () => observer.disconnect();
  }, []);
  const barShown = !addRowVisible && !endVisible;

  const addLabel = (
    // One inline run so the button's flex gap does not split the label.
    <span>
      {t.addToCart.verb}
      <span className="max-[1439px]:sr-only">{t.addToCart.rest}</span>
      {` · ${formatRupiah(variant.price * qty)}`}
    </span>
  );

  return (
    <>
      <div className="flex w-full flex-col gap-3.5">
        <p className="font-mono text-[13px] leading-[20px] font-semibold tracking-[1px] text-primary">{eyebrow}</p>
        <h1 className="type-page font-display text-balance font-bold text-foreground">{product.name}</h1>
        <p className="flex items-end gap-2.5">
          <span className="font-display text-[28px] leading-[31px] font-bold text-foreground lg:text-[32px] lg:leading-[35px]">
            {formatRupiah(variant.price)}
          </span>
          {unit ? <span className="text-[15px] leading-[23px] text-muted-foreground">{unit}</span> : null}
        </p>
        {rating ? (
          <a
            href="#reviews"
            className="group relative flex w-fit items-center gap-2 text-[15px] leading-[23px] text-foreground after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']"
          >
            <Star className="size-4 shrink-0 fill-highlight text-foreground" aria-hidden />
            <span className="sr-only">{t.rating.rated} </span>
            <span className="font-bold">{rating.value}</span>
            <span className="sr-only"> {t.rating.outOf}</span>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            <span className="font-semibold underline decoration-border underline-offset-4 group-hover:no-underline">
              {t.rating.count(rating.count)}
            </span>
          </a>
        ) : null}
      </div>

      <p className="text-base leading-[24px] text-muted-foreground lg:text-lg lg:leading-[27px]">{description}</p>

      <div className="flex w-full flex-col gap-4 rounded-m bg-card p-4 sm:p-6">
        {multi ? (
          <fieldset className="flex w-full flex-col gap-2.5">
            <legend className="mb-3 font-mono text-[13px] leading-[20px] font-semibold tracking-[1px] text-primary uppercase">
              {t.size}
            </legend>
            {product.variants.map((v) => (
              <OptionTile
                key={v.id}
                name="size"
                value={v.id}
                checked={v.id === variantId}
                onChange={setVariantId}
                title={v.name}
                sub={v.serves}
                meta={<span className="text-base font-bold">{formatRupiah(v.price)}</span>}
                className="min-h-[71px] px-[18px]! py-3.5! inset-ring-[1.5px]!"
              />
            ))}
          </fieldset>
        ) : null}
        <div ref={addRowRef} className="flex w-full flex-wrap items-center gap-4">
          <QuantityStepper
            value={qty}
            onChange={setQty}
            min={1}
            max={99}
            labels={{ decrease: t.decrease, increase: t.increase }}
            className="bg-white"
          />
          <Button
            className="min-w-0 flex-1 px-4 aria-disabled:cursor-wait aria-disabled:opacity-50 sm:min-w-[200px] sm:px-7"
            aria-disabled={pending || undefined}
            aria-busy={pending || undefined}
            onClick={() => add(variant.id, qty)}
          >
            {addLabel}
          </Button>
        </div>
        {failed ? (
          <p role="alert" className="text-sm leading-[21px] font-semibold text-error">
            {t.error}
          </p>
        ) : null}
        {deliveryFee || pickup ? (
          <ul className="flex w-full flex-wrap gap-x-6 gap-y-2">
            {deliveryFee ? (
              <li className="flex items-center gap-2">
                <Truck className="size-[18px] shrink-0" aria-hidden />
                <span className="text-sm leading-[21px] font-semibold text-foreground">{t.perkDelivery(deliveryFee)}</span>
              </li>
            ) : null}
            {pickup ? (
              <li className="flex items-center gap-2">
                <Store className="size-[18px] shrink-0" aria-hidden />
                <span className="text-sm leading-[21px] font-semibold text-foreground">{t.perkPickup}</span>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {/* Pinned buy bar below lg (same paper, hairline and button as the checkout PAY bar). `invisible`
          takes it out of the tab order and the accessibility tree while it is slid away. */}
      <div
        data-pinned-bar
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--border-subtle)] transition-[translate,visibility] duration-200 ease-out motion-reduce:transition-none md:px-8 lg:hidden",
          !barShown && "invisible translate-y-full",
        )}
      >
        {/* The box's own alert announces the error; this is the visible copy next to the button used. */}
        {failed ? <p className="text-sm leading-[21px] font-semibold text-error">{t.error}</p> : null}
        <div className="flex items-center gap-3 sm:gap-4">
          <p className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] leading-5 text-muted-foreground">
              {multi ? variant.name : product.name}
            </span>
            <span className="font-display text-lg leading-[22px] font-bold text-foreground">
              {formatRupiah(variant.price)}
            </span>
          </p>
          <QuantityStepper
            value={qty}
            onChange={setQty}
            min={1}
            max={99}
            labels={{ decrease: t.decrease, increase: t.increase }}
            className="hidden bg-white sm:inline-flex"
          />
          <Button
            className="shrink-0 px-5 aria-disabled:cursor-wait aria-disabled:opacity-50"
            aria-disabled={pending || undefined}
            aria-busy={pending || undefined}
            onClick={() => add(variant.id, qty)}
          >
            {addLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
