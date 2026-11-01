"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OptionTile } from "@/components/ui/choice-tiles";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { formatRupiah } from "@/lib/format";
import type { ShopProduct } from "@/components/shop/shop-product";
import { useAddToCart } from "@/components/shop/use-add-to-cart";

/**
 * Home brownies band: the tray sizes are the choice itself (same tiles as the size modal),
 * with the quantity and ADD TO CART right under them, so the band buys without a detour.
 */
export function BrowniePicker({ product, legend }: { product: ShopProduct; legend: string }) {
  const m = useMessages(menuMessages);
  const t = m.sizeModal;
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [qty, setQty] = useState(1);
  const { add, pending, failed } = useAddToCart();
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];

  return (
    <div className="@container flex w-full flex-col gap-4">
      {/* Two columns only when the picker is wide enough for "20 × 30 cm" and its price side by side. */}
      <fieldset className="grid w-full grid-cols-1 gap-2.5 @[32rem]:grid-cols-2">
        <legend className="sr-only">{legend}</legend>
        {product.variants.map((v) => (
          <OptionTile
            key={v.id}
            name={`home-size-${product.id}`}
            value={v.id}
            checked={v.id === variantId}
            onChange={setVariantId}
            title={<span className="whitespace-nowrap">{v.name}</span>}
            sub={v.serves}
            meta={<span className="text-base font-bold">{formatRupiah(v.price)}</span>}
            className="min-h-16 px-[18px]! py-3!"
          />
        ))}
      </fieldset>

      <div className="flex w-full items-center gap-4">
        <QuantityStepper
          value={qty}
          onChange={setQty}
          min={1}
          max={99}
          labels={{ decrease: t.decrease, increase: t.increase }}
          className="bg-white"
        />
        <Button
          className="min-w-0 flex-1 px-4 aria-disabled:cursor-wait aria-disabled:opacity-50 sm:px-7"
          aria-disabled={pending || undefined}
          aria-busy={pending || undefined}
          onClick={() => add(variant.id, qty)}
        >
          <span>
            {t.addVerb}
            <span className="max-sm:sr-only">{t.addRest}</span>
            {` · ${formatRupiah(variant.price * qty)}`}
          </span>
        </Button>
      </div>
      {failed ? (
        <p role="alert" className="text-sm leading-normal font-semibold text-error">
          {m.card.error}
        </p>
      ) : null}
    </div>
  );
}
