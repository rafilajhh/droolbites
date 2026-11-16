"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addToCart } from "@/app/actions/cart";
import { useOpenCart } from "@/components/layout/shop-ui";

/**
 * Adds a variant to the cookie cart, then slides the cart drawer in.
 * `pending` stays true until the server action (and its revalidation) is done;
 * repeated calls while pending are ignored, so a double click adds once.
 * Buttons use aria-disabled (not `disabled`) while pending so they keep focus.
 * `failed` clears itself after a few seconds. When stock refused the add, `left`
 * says why: 0 = sold out, n = the cart already holds the n that are left.
 */
export function useAddToCart() {
  const openCart = useOpenCart();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const busy = useRef(false);
  const clearFailed = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(clearFailed.current), []);

  const fail = (stockLeft?: number) => {
    setFailed(true);
    setLeft(stockLeft ?? null);
    clearTimeout(clearFailed.current);
    clearFailed.current = setTimeout(() => {
      setFailed(false);
      setLeft(null);
    }, 4000);
  };

  const add = (variantId: string, qty: number, onAdded?: () => void) => {
    if (busy.current) return;
    busy.current = true;
    clearTimeout(clearFailed.current);
    setFailed(false);
    setLeft(null);
    startTransition(async () => {
      try {
        const result = await addToCart(variantId, qty);
        if (result.ok) {
          onAdded?.();
          openCart();
        } else {
          fail(result.left);
        }
      } catch {
        fail();
      } finally {
        busy.current = false;
      }
    });
  };

  return { add, pending, failed, left };
}
