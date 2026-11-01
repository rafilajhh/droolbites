"use client";

import { useEffect, useState } from "react";
import { LogOut, MapPin, Receipt, User } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { useMessages } from "@/i18n/client";
import { accountMessages } from "@/i18n/messages/account";
import { cn } from "@/lib/cn";

const ACCOUNT_SECTIONS = ["order-history", "account-information", "saved-address"] as const;
type SectionId = (typeof ACCOUNT_SECTIONS)[number];

/** Below lg the three sections sit in one row with the icon above the label; from lg a vertical list. */
const itemClass =
  "flex w-full flex-col items-center gap-1 rounded-sm px-2 py-2.5 text-center text-[13px] leading-[18px] text-foreground transition-colors hover:bg-card motion-reduce:transition-none sm:text-[15px] sm:leading-[23px] lg:flex-row lg:gap-3 lg:px-4 lg:py-3.5 lg:text-left";

/**
 * pen: Side Nav (ThhBD). Links jump to each card; the current card is highlighted while scrolling.
 * Sign out is a quieter text action under the section links, not one of them.
 */
export function AccountNav() {
  const t = useMessages(accountMessages).nav;
  const [active, setActive] = useState<SectionId>("order-history");

  useEffect(() => {
    const sections = ACCOUNT_SECTIONS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    // The observer only reports sections whose state changed, so keep the full set and pick the topmost.
    const inView = new Set<SectionId>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inView.add(e.target.id as SectionId);
          else inView.delete(e.target.id as SectionId);
        }
        const top = ACCOUNT_SECTIONS.find((id) => inView.has(id));
        if (top) setActive(top);
      },
      { rootMargin: "-20% 0px -55% 0px" },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const links: { id: SectionId; label: string; short: string; Icon: typeof Receipt }[] = [
    { id: "order-history", label: t.orders, short: t.short.orders, Icon: Receipt },
    { id: "account-information", label: t.info, short: t.short.info, Icon: User },
    { id: "saved-address", label: t.address, short: t.short.address, Icon: MapPin },
  ];

  return (
    <div className="flex w-full gap-1 lg:flex-col lg:gap-3">
      <nav aria-label={t.label} className="min-w-0 flex-1">
        <ul className="grid grid-cols-3 gap-1 lg:flex lg:flex-col">
          {links.map(({ id, label, short, Icon }) => {
            const current = active === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={() => setActive(id)}
                  aria-current={current ? "location" : undefined}
                  className={cn(itemClass, current ? "bg-card font-bold" : "font-medium")}
                >
                  <Icon className={cn("size-5 shrink-0", current ? "text-primary" : "text-foreground")} aria-hidden />
                  <span className="sm:hidden" aria-hidden>
                    {short}
                  </span>
                  <span className="max-sm:sr-only">{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <form action={signOut} className="flex max-lg:shrink-0 lg:pt-3 lg:shadow-[inset_0_1px_0_var(--border-subtle)]">
        <button
          type="submit"
          className="flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm px-3 text-[13px] lg:flex-row lg:gap-2 lg:text-sm leading-[18px] font-semibold text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none lg:px-4 lg:leading-normal"
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {t.signOut}
        </button>
      </form>
    </div>
  );
}
