"use client";

import { useState } from "react";
import { Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptionTile } from "@/components/ui/choice-tiles";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useMessages } from "@/i18n/client";
import { productMessages } from "@/i18n/messages/product";
import { formatRupiah } from "@/lib/format";
import type { ShopProduct } from "./shop-product";
import { useAddToCart } from "./use-add-to-cart";

/**
 * Product detail head + Buy box (w7mQL): price, quantity stepper and
 * "ADD TO CART · Rp…" (follows qty and size). Products with several sizes
 * get a size picker inside the box.
 */
export function ProductBuy({
  product,
  eyebrow,
  description,
  unit,
}: {
  product: ShopProduct;
  eyebrow: string;
  description: string;
  unit: string;
}) {
  const t = useMessages(productMessages);
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [qty, setQty] = useState(1);
  const { add, pending, failed } = useAddToCart();
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const multi = product.variants.length > 1;

  return (
    <>
      <div className="flex w-full flex-col gap-3.5">
        <p className="font-mono text-[13px] leading-[20px] font-semibold tracking-[1px] text-primary">{eyebrow}</p>
        <h1 className="font-display text-balance text-[44px] leading-[44px] font-bold tracking-[-1px] text-foreground sm:text-[56px] sm:leading-[56px] lg:text-[64px] lg:leading-[64px] lg:tracking-[-1.5px]">
          {product.name}
        </h1>
        <p className="flex items-end gap-2.5">
          <span className="font-display text-[28px] leading-[31px] font-bold text-foreground lg:text-[32px] lg:leading-[35px]">
            {formatRupiah(variant.price)}
          </span>
          {unit ? <span className="text-[15px] leading-[23px] text-muted-foreground">{unit}</span> : null}
        </p>
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
        <div className="flex w-full flex-wrap items-center gap-4">
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
            {t.addToCart(formatRupiah(variant.price * qty))}
          </Button>
        </div>
        {failed ? (
          <p role="alert" className="text-sm leading-[21px] font-semibold text-error">
            {t.error}
          </p>
        ) : null}
        <ul className="flex w-full flex-wrap gap-x-6 gap-y-2">
          <li className="flex items-center gap-2">
            <Truck className="size-[18px] shrink-0" aria-hidden />
            <span className="text-sm leading-[21px] font-semibold text-foreground">{t.perkDelivery}</span>
          </li>
          <li className="flex items-center gap-2">
            <Store className="size-[18px] shrink-0" aria-hidden />
            <span className="text-sm leading-[21px] font-semibold text-foreground">{t.perkPickup}</span>
          </li>
        </ul>
      </div>
    </>
  );
}
