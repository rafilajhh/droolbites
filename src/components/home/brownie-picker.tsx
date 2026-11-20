"use client";

import { Button } from "@/components/ui/button";
import { OptionTile } from "@/components/ui/choice-tiles";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { formatRupiah } from "@/lib/format";
import type { ShopProduct } from "@/components/shop/shop-product";
import { SizeSub, useAddError, useSizeChoice } from "@/components/shop/stock";
import { useAddToCart } from "@/components/shop/use-add-to-cart";

/**
 * Home brownies band: the tray sizes are the choice itself (same tiles as the size modal),
 * with the quantity and ADD TO CART right under them, so the band buys without a detour.
 */
export function BrowniePicker({ product, legend }: { product: ShopProduct; legend: string }) {
  const m = useMessages(menuMessages);
  const t = m.sizeModal;
  const { variant, setVariantId, qty, setQty, max, soldOut } = useSizeChoice(product);
  const { add, pending, failed, left, max: cap } = useAddToCart();
  const errorText = useAddError(left, m.card.error, cap);

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
            checked={v.id === variant.id}
            onChange={setVariantId}
            disabled={v.left === 0}
            title={<span className="whitespace-nowrap">{v.name}</span>}
            sub={<SizeSub serves={v.serves} left={v.left} />}
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
          max={max}
          disabled={soldOut}
          labels={{ decrease: t.decrease, increase: t.increase }}
          className="bg-white"
        />
        <Button
          className="min-w-0 flex-1 px-4 aria-disabled:cursor-wait aria-disabled:opacity-50 sm:px-7"
          disabled={soldOut}
          aria-disabled={pending || undefined}
          aria-busy={pending || undefined}
          onClick={() => add(variant.id, qty)}
        >
          {soldOut ? (
            <span className="uppercase">{m.stock.soldOut}</span>
          ) : (
            <span>
              {t.addVerb}
              <span className="max-sm:sr-only">{t.addRest}</span>
              {` · ${formatRupiah(variant.price * qty)}`}
            </span>
          )}
        </Button>
      </div>
      {failed ? (
        <p role="alert" className="text-sm leading-normal font-semibold text-error">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
