"use client";

import { useId, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { useModal } from "@/components/layout/shop-ui";
import { Button } from "@/components/ui/button";
import { OptionTile } from "@/components/ui/choice-tiles";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { formatRupiah } from "@/lib/format";
import type { ShopProduct } from "./shop-product";
import { useAddToCart } from "./use-add-to-cart";

/**
 * pen: Brownie size (kfcyP) → Size Modal. 960×680 dialog centered on a 50%
 * ink scrim; a bottom sheet on small screens. Rendered only while open.
 */
export function SizeModal({ product, open, onClose }: { product: ShopProduct; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return createPortal(<SizeModalPanel product={product} onClose={onClose} />, document.body);
}

function SizeModalPanel({ product, onClose }: { product: ShopProduct; onClose: () => void }) {
  const t = useMessages(menuMessages).sizeModal;
  const panelRef = useModal(true, onClose);
  const titleId = useId();
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [qty, setQty] = useState(1);
  const { add, pending, failed } = useAddToCart();
  const errorText = useMessages(menuMessages).card.error;

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const isTray = product.categorySlug === "brownies";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-t-m bg-background md:h-[680px] md:max-h-full md:w-[960px] md:flex-row md:overflow-hidden md:rounded-m"
      >
        <div className="relative hidden w-[400px] shrink-0 bg-oat md:block">
          <Image src={product.imageUrl} alt="" fill sizes="400px" quality={100} className="object-cover" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5 p-5 pb-8 md:overflow-y-auto md:p-10">
          <div className="flex w-full items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="font-mono text-xs leading-[18px] font-semibold tracking-[1px] text-primary uppercase">
                {product.name}
              </p>
              <h2
                id={titleId}
                className="font-display text-[28px] leading-[30px] font-bold md:text-[36px] md:leading-[38px]"
              >
                {isTray ? t.titleTray : t.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="relative flex size-10 shrink-0 items-center justify-center rounded-pill bg-oat after:absolute after:-inset-0.5 after:content-[''] transition-colors hover:bg-card-accent"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <fieldset className="flex w-full flex-col gap-2.5">
            <legend className="sr-only">{isTray ? t.titleTray : t.title}</legend>
            {product.variants.map((v) => (
              <OptionTile
                key={v.id}
                name={`size-${product.id}`}
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

          <div className="flex w-full items-center gap-4 pt-2">
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
              onClick={() => add(variant.id, qty, onClose)}
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
              {errorText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
