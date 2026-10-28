"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * pen: Quantity Stepper (kOtc6). `size="sm"` is the compact override used in
 * the cart drawer (28px buttons, 14px icons, 14px value).
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  disabled,
  labels = { decrease: "Decrease quantity", increase: "Increase quantity" },
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "md" | "sm";
  disabled?: boolean;
  labels?: { decrease: string; increase: string };
  className?: string;
}) {
  const sm = size === "sm";
  const btn = cn(
    "flex items-center justify-center rounded-pill transition-colors hover:bg-card disabled:opacity-40",
    // Invisible 44px hit areas: sm is a 28px button, default 36px.
    sm ? "relative size-7 after:absolute after:-inset-2 after:content-['']" : "relative size-9 after:absolute after:-inset-1 after:content-['']",
  );
  const icon = sm ? "size-3.5" : "size-[18px]";
  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-pill inset-ring-[1.25px] inset-ring-border",
        sm ? "p-0.5" : "p-1",
        className,
      )}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label={labels.decrease}
      >
        <Minus className={icon} aria-hidden />
      </button>
      <span
        className={cn("text-center font-bold leading-normal tabular-nums", sm ? "w-6 text-sm" : "w-8 text-base")}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label={labels.increase}
      >
        <Plus className={icon} aria-hidden />
      </button>
    </div>
  );
}
