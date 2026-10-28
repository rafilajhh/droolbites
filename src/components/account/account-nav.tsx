"use client";

import { useEffect, useState } from "react";
import { LogOut, MapPin, Receipt, User } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { useMessages } from "@/i18n/client";
import { accountMessages } from "@/i18n/messages/account";
import { cn } from "@/lib/cn";

const ACCOUNT_SECTIONS = ["order-history", "account-information", "billing-information"] as const;
type SectionId = (typeof ACCOUNT_SECTIONS)[number];

const itemClass =
  "flex w-full items-center gap-3 rounded-sm px-4 py-3.5 text-left text-[15px] leading-[23px] text-foreground transition-colors hover:bg-card";

/** pen: Side Nav (ThhBD). Links jump to each card; the current card is highlighted while scrolling. */
export function AccountNav() {
  const t = useMessages(accountMessages).nav;
  const [active, setActive] = useState<SectionId>("order-history");

  useEffect(() => {
    const sections = ACCOUNT_SECTIONS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id as SectionId);
      },
      { rootMargin: "-20% 0px -55% 0px" },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const links: { id: SectionId; label: string; short: string; Icon: typeof Receipt }[] = [
    { id: "order-history", label: t.orders, short: t.short.orders, Icon: Receipt },
    { id: "account-information", label: t.info, short: t.short.info, Icon: User },
    { id: "billing-information", label: t.billing, short: t.short.billing, Icon: MapPin },
  ];

  return (
    <nav aria-label={t.label} className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[260px]">
      <ul className="grid grid-cols-2 gap-1 lg:flex lg:flex-col">
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
        <li>
          <form action={signOut}>
            <button type="submit" className={cn(itemClass, "cursor-pointer font-medium")}>
              <LogOut className="size-5 shrink-0" aria-hidden />
              {t.signOut}
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
