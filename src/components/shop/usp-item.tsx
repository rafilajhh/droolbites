import type { LucideIcon } from "lucide-react";

/**
 * pen: USP Item (ntOiE) — icon + italic mono label.
 * `hidden` keeps the item visible but removes it from the accessibility tree
 * (used for the repeated copies in the marquee).
 */
export function UspItem({ icon: Icon, label, hidden }: { icon: LucideIcon; label: string; hidden?: boolean }) {
  return (
    <li className="flex shrink-0 items-center gap-2.5" aria-hidden={hidden || undefined}>
      <Icon className="size-5 shrink-0 text-foreground" aria-hidden />
      <span className="font-mono text-sm leading-[18px] font-semibold tracking-[-0.25px] whitespace-nowrap text-foreground italic sm:text-base sm:leading-[21px]">
        {label}
      </span>
    </li>
  );
}
