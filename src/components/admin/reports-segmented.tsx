import Link from "next/link";
import { cn } from "@/lib/cn";

export type SegmentedOption = { value: string; label: string; href: string; count?: number };

/**
 * Segmented links in one white capsule (the menu's category control, admin-sized): the report
 * period and the Customers / Newsletter switch. Plain links, so the choice lives in the URL and
 * works before JS. Scrolls sideways if the labels don't fit a phone.
 */
export function SegmentedLinks({
  label,
  options,
  value,
  className,
}: {
  label: string;
  options: SegmentedOption[];
  value: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      <ul className="flex w-max items-center gap-1 rounded-pill bg-white p-0.5 inset-ring-[1.25px] inset-ring-border-input lg:p-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <li key={o.value}>
              <Link
                href={o.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-pill px-4 text-[15px] leading-[18px] font-semibold whitespace-nowrap transition-colors lg:h-10",
                  active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-oat",
                )}
              >
                {o.label}
                {o.count !== undefined ? (
                  <span
                    className={cn(
                      "font-mono text-xs leading-[14px] font-semibold tabular-nums",
                      active ? "text-mint" : "text-muted-foreground",
                    )}
                  >
                    {o.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
