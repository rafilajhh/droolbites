"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/** `dot`: category color only; status options carry no dot. */
export type DropdownOption = { value: string; label: string; dot?: string };

/** Floating panel look shared by the admin dropdowns and search popovers. */
export const popoverClasses =
  "absolute z-50 flex flex-col gap-0.5 rounded-m bg-white p-2 shadow-[0_12px_32px_color-mix(in_srgb,var(--ink)_15%,transparent)] inset-ring-1 inset-ring-border-subtle";

/**
 * The faint ink scrim behind an open dropdown (pen: Scrim, ink 8%). Pressing it
 * must not move focus (e.g. to <main tabIndex={-1}>), so the popover stays open
 * until onClick closes it and returns focus to its trigger.
 */
export function Scrim({ onClick }: { onClick: () => void }) {
  return (
    <div aria-hidden className="fixed inset-0 z-40 bg-ink/8" onMouseDown={(e) => e.preventDefault()} onClick={onClick} />
  );
}

/**
 * pen: Payment Filter / Category Filter / Fulfilment Options — a listbox
 * popover with an optional category dot per option and a check on the selected one.
 * `trigger` renders the button face; the button itself handles a11y. Its
 * accessible name carries the current value: "${label}: ${current}", or the
 * `labelledBy` element followed by the button's own text.
 */
export function Dropdown({
  label,
  options,
  value,
  onChange,
  trigger,
  triggerClassName,
  panelClassName,
  disabled,
  labelledBy,
}: {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  trigger: React.ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  disabled?: boolean;
  labelledBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const hide = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    hide();
    if (option && option.value !== value) onChange(option.value);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") setActive((i) => Math.min(options.length - 1, i + 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(options.length - 1);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else if (e.key === "Escape") hide();
    else if (e.key === "Tab") hide(false);
    else return;
    e.preventDefault();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        id={`${id}-button`}
        aria-label={labelledBy ? undefined : `${label}: ${options.find((o) => o.value === value)?.label ?? ""}`}
        aria-labelledby={labelledBy ? `${labelledBy} ${id}-button` : undefined}
        onClick={() => (open ? hide() : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show();
          }
        }}
        className={cn("disabled:cursor-not-allowed disabled:opacity-60", triggerClassName)}
      >
        {trigger}
      </button>
      {open ? (
        <>
          <Scrim onClick={() => hide()} />
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={`${id}-opt-${active}`}
            onKeyDown={onKeyDown}
            className={cn(popoverClasses, "top-[calc(100%+7px)] left-0 outline-hidden", panelClassName)}
          >
            {options.map((o, i) => {
              const selected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(i)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-3 py-[11px] text-[15px] leading-[23px] text-foreground",
                    selected ? "bg-mint font-bold" : "font-medium",
                    !selected && i === active && "bg-background",
                  )}
                >
                  {o.dot ? <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", o.dot)} /> : null}
                  <span className="flex-1">{o.label}</span>
                  {selected ? <Check className="size-[18px] shrink-0 text-primary" aria-hidden /> : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/** "Payment: All orders ⌄" — the toolbar face of a filter dropdown. */
export function FilterFace({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-2.5 text-sm leading-[21px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
      <ChevronDown className="size-4 shrink-0 text-foreground" aria-hidden />
    </span>
  );
}

export const toolbarFieldClasses =
  "flex items-center gap-2.5 rounded-sm bg-white px-3.5 py-[11px] inset-ring-[1.25px] inset-ring-border-input transition-shadow hover:inset-ring-border";
