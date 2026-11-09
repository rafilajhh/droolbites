import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * pen: Option Tile (Q28fn) — a radio card. Selected: mint fill with a 1.5px
 * moss stroke and a filled dot; unselected: white with a subtle stroke.
 * Renders a real radio input so it works inside a plain <form>.
 */
export function OptionTile({
  name,
  value,
  checked,
  defaultChecked,
  onChange,
  icon: Icon,
  title,
  sub,
  meta,
  metaPlacement = "aside",
  disabled,
  className,
}: {
  name: string;
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (value: string) => void;
  icon?: LucideIcon;
  title: React.ReactNode;
  sub?: React.ReactNode;
  meta?: React.ReactNode;
  /** Put the price beside the title so a description can use the full text column. */
  metaPlacement?: "aside" | "header";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex w-full cursor-pointer items-center gap-3.5 rounded-sm bg-white px-5 py-[18px] inset-ring-[1.25px] inset-ring-border-subtle transition-colors",
        "has-[:checked]:bg-mint has-[:checked]:inset-ring-[1.5px] has-[:checked]:inset-ring-border",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)]",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange ? () => onChange(value) : undefined}
        className="peer sr-only"
      />
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full inset-ring-[1.5px] inset-ring-border peer-checked:[&>span]:block">
        <span className="hidden size-2.5 rounded-full bg-primary" />
      </span>
      {Icon ? <Icon className="size-[22px] shrink-0 text-foreground" aria-hidden /> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {metaPlacement === "header" ? (
          <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-base font-bold leading-[1.3] text-foreground">{title}</span>
            {meta ? <span className="ml-auto shrink-0 text-sm font-semibold leading-normal text-foreground">{meta}</span> : null}
          </span>
        ) : (
          <span className="text-base font-bold leading-[1.3] text-foreground">{title}</span>
        )}
        {sub ? <span className="text-[13px] leading-normal text-muted-foreground">{sub}</span> : null}
      </span>
      {meta && metaPlacement === "aside" ? <span className="shrink-0 text-sm font-semibold leading-normal text-foreground">{meta}</span> : null}
    </label>
  );
}

/** pen: Payment Option (CuGEV) — radio, brand mark, name and hint. */
export function PaymentOption({
  name,
  value,
  checked,
  defaultChecked,
  onChange,
  markLabel,
  markClassName,
  logoUrl,
  title,
  sub,
  disabled,
  className,
}: {
  name: string;
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (value: string) => void;
  markLabel: string;
  markClassName: string; // brand colors, e.g. "bg-[#00AED6] text-white"
  /** The gateway's logo; replaces the text mark when given. */
  logoUrl?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex w-full cursor-pointer items-center gap-3.5 rounded-sm bg-white px-[18px] py-4 inset-ring-[1.25px] inset-ring-border-subtle transition-colors",
        "has-[:checked]:bg-mint has-[:checked]:inset-ring-[1.5px] has-[:checked]:inset-ring-border",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)]",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange ? () => onChange(value) : undefined}
        className="peer sr-only"
      />
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full inset-ring-[1.5px] inset-ring-border peer-checked:[&>span]:block">
        <span className="hidden size-2.5 rounded-full bg-primary" />
      </span>
      <PaymentMark label={markLabel} className={markClassName} logoUrl={logoUrl} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold leading-[1.3] text-foreground">{title}</span>
        {sub ? <span className="text-[13px] leading-[1.35] text-muted-foreground">{sub}</span> : null}
      </span>
    </label>
  );
}

/**
 * The 56×36 brand mark of a payment method: the gateway's logo on white when
 * there is one (shown as is, never recompressed), else a text mark in the
 * brand's colors. Decorative: the method name always sits next to it.
 */
export function PaymentMark({ label, className, logoUrl }: { label: string; className: string; logoUrl?: string }) {
  if (logoUrl) {
    return (
      <span aria-hidden className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg bg-white px-1 inset-ring-1 inset-ring-border-subtle">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote logo served as is (cache-forever ?v= URL) */}
        <img src={logoUrl} alt="" decoding="async" className="max-h-7 max-w-full object-contain" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-14 shrink-0 items-center justify-center rounded-lg font-display text-[13px] font-extrabold leading-none",
        className,
      )}
    >
      {label}
    </span>
  );
}
