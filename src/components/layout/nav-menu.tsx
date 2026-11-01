"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { commonMessages } from "@/i18n/messages/common";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { LanguageSwitch } from "./language-switch";
import { useModal, useShopUI } from "./shop-ui";

/** pen: Navigation menu (wNl2v) → Menu Drawer (g3WhFx), 520px from the left. */
export function NavMenu({ accountHref, email }: { accountHref: string; email: string }) {
  const t = useMessages(commonMessages).nav;
  const { panel, close } = useShopUI();
  const pathname = usePathname();
  const isOpen = panel === "menu";
  const panelRef = useModal(isOpen, close);

  const links = [
    { href: "/", label: t.home, dot: "bg-accent-magenta" },
    { href: "/menu", label: t.menu, dot: "bg-accent-mustard" },
    { href: "/our-story", label: t.story, dot: "bg-accent-teal" },
    { href: "/location", label: t.location, dot: "bg-accent-lavender" },
    { href: "/faq", label: t.faq, dot: "bg-accent-orange" },
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className={cn("fixed inset-0 z-50", !isOpen && "pointer-events-none")} inert={!isOpen}>
      <div
        className={cn("absolute inset-0 bg-ink/50 transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0")}
        onClick={close}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        className={cn(
          "absolute inset-y-0 left-0 flex w-full max-w-[520px] flex-col justify-between overflow-y-auto bg-background px-5 pt-5 pb-8 transition-transform duration-300 ease-out sm:px-10 sm:pt-7 sm:pb-10",
          "motion-reduce:translate-x-0 motion-reduce:transition-opacity motion-reduce:duration-150",
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-full motion-reduce:opacity-0",
        )}
      >
        <div className="flex w-full flex-col gap-10 sm:gap-12">
          <div className="flex w-full items-center justify-between">
            <Image
              src="/images/site/logo-badge.png"
              alt="Droolbites"
              width={72}
              height={72}
              quality={100}
              className="size-14 rounded-pill object-cover sm:size-[72px]"
            />
            <button
              type="button"
              onClick={close}
              aria-label={t.close}
              data-autofocus
              className="flex size-11 items-center justify-center rounded-pill bg-oat transition-colors hover:bg-card-accent"
            >
              <X className="size-[22px]" aria-hidden />
            </button>
          </div>

          <nav className="flex w-full flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                aria-current={isActive(link.href) ? "page" : undefined}
                className="group flex w-full items-center gap-4 py-4 shadow-[inset_0_-1px_0_var(--border-subtle)]"
              >
                <span className={cn("size-3.5 shrink-0 rounded-full", link.dot)} aria-hidden />
                <span
                  className={cn(
                    "flex-1 font-display text-[32px] leading-[1.1] font-bold transition-colors sm:text-[40px]",
                    isActive(link.href) ? "text-primary" : "text-foreground group-hover:text-primary",
                  )}
                >
                  {link.label}
                </span>
                <ArrowRight
                  className="size-[26px] shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  aria-hidden
                />
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex w-full flex-col gap-4">
          {/* The header hides language and search below sm, so the drawer carries them there. */}
          <div className="flex w-full items-center justify-between gap-4 sm:hidden">
            <LanguageSwitch />
            <Link
              href="/menu?search=1"
              onClick={close}
              className="relative flex items-center gap-2 text-[15px] leading-normal font-semibold text-foreground after:absolute after:-inset-x-2 after:-inset-y-[11px] after:content-[''] hover:text-primary"
            >
              <Search className="size-[18px] shrink-0" aria-hidden />
              {t.search}
            </Link>
          </div>
          <Link href="/menu" onClick={close} className={buttonClasses("primary", "w-full")}>
            {t.orderNow}
          </Link>
          <div className="flex w-full flex-wrap justify-between gap-2 text-[15px] leading-normal">
            <Link
              href={accountHref}
              onClick={close}
              className="relative font-semibold text-foreground after:absolute after:-inset-x-2 after:-inset-y-[11px] after:content-[''] hover:text-primary"
            >
              {t.account}
            </Link>
            <a
              href={`mailto:${email}`}
              className="relative text-muted-foreground after:absolute after:-inset-x-2 after:-inset-y-[11px] after:content-[''] hover:text-foreground"
            >
              {email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
