"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { Cookie, ExternalLink, LayoutDashboard, LogOut, Menu, Receipt, Settings, X, type LucideIcon } from "lucide-react";
import { adminSignOut } from "@/app/actions/admin/auth";
import { useModal } from "@/components/layout/shop-ui";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";

type Props = { storeName: string; city: string; openNow: boolean };

const NAV: { href: string; key: "overview" | "orders" | "products" | "settings"; icon: LucideIcon }[] = [
  { href: "/admin", key: "overview", icon: LayoutDashboard },
  { href: "/admin/orders", key: "orders", icon: Receipt },
  { href: "/admin/products", key: "products", icon: Cookie },
  { href: "/admin/settings", key: "settings", icon: Settings },
];

function Brand({ storeName, sub, size = 48 }: { storeName: string; sub: string; size?: number }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Image
        src="/images/site/logo-badge.png"
        alt=""
        width={size}
        height={size}
        quality={100}
        className="shrink-0 rounded-full"
        style={{ width: size, height: size }}
      />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-display text-xl leading-[22px] font-bold text-white">{storeName}</span>
        <span className="text-[13px] leading-5 text-mint">{sub}</span>
      </div>
    </div>
  );
}

/** pen: Admin Sidebar (b1FcOS). */
function SidebarContent({ storeName, city, openNow, onNavigate }: Props & { onNavigate?: () => void }) {
  const t = useMessages(adminMessages).sidebar;
  const pathname = usePathname();

  return (
    <>
      <div className="flex w-full flex-col gap-8">
        <div className="px-2">
          <Brand storeName={storeName} sub={t.storeAdmin} />
        </div>
        <nav aria-label={t.nav}>
          <ul className="flex w-full flex-col gap-1">
            {NAV.map(({ href, key, icon: Icon }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              return (
                <li key={key}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-sm px-3.5 py-3 text-[15px] leading-5 font-semibold transition-colors",
                      active ? "bg-background text-primary" : "text-white hover:bg-white/10",
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    {t[key]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full flex-col gap-1 rounded-sm bg-white/8 p-4">
          <p className="font-mono text-[11px] leading-[17px] font-semibold tracking-[1px] text-mint">
            {openNow ? t.openToday : t.closedNow}
          </p>
          <p className="text-sm leading-[21px] font-semibold text-white">
            {storeName} · {city}
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="flex w-full items-center gap-3 rounded-sm px-3.5 py-2.5 text-sm leading-[21px] text-mint transition-colors hover:bg-white/10"
        >
          <ExternalLink className="size-[18px] shrink-0" aria-hidden />
          {t.storefront}
          <span className="sr-only">{t.newTab}</span>
        </a>
        <div className="flex w-full items-center gap-2">
          <form action={adminSignOut} className="min-w-0 flex-1">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-sm px-3.5 py-2.5 text-left text-sm leading-[21px] text-mint transition-colors hover:bg-white/10"
            >
              <LogOut className="size-[18px] shrink-0" aria-hidden />
              {t.signOut}
            </button>
          </form>
          <LanguageSwitch tone="inverse" className="shrink-0" />
        </div>
      </div>
    </>
  );
}

/** Fixed 272px sidebar from lg up; a top bar with a slide-in drawer below that. */
export function AdminSidebar(props: Props) {
  const t = useMessages(adminMessages).sidebar;
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const panelRef = useModal(open, close);

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[272px] shrink-0 flex-col justify-between gap-8 overflow-y-auto bg-primary [--focus-ring:var(--white)] px-5 py-7 lg:flex">
        <SidebarContent {...props} />
      </aside>

      <div className="sticky top-0 z-30 flex w-full items-center justify-between gap-3 bg-primary [--focus-ring:var(--white)] px-4 py-2.5 lg:hidden">
        <Brand storeName={props.storeName} sub={t.storeAdmin} size={40} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.openMenu}
          aria-expanded={open}
          className="flex size-11 items-center justify-center rounded-sm text-white transition-colors hover:bg-white/10"
        >
          <Menu className="size-6" aria-hidden />
        </button>
      </div>

      <div className={cn("fixed inset-0 z-50 lg:hidden", !open && "pointer-events-none")} inert={!open}>
        <div
          className={cn("absolute inset-0 bg-ink/50 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
          onClick={close}
          aria-hidden
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={t.nav}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col justify-between gap-8 overflow-y-auto bg-primary [--focus-ring:var(--white)] px-5 pt-16 pb-7 transition-transform duration-300 ease-out",
            // Reduced motion: fade in place instead of sliding.
            "motion-reduce:translate-x-0 motion-reduce:transition-opacity motion-reduce:duration-150",
            open ? "translate-x-0 opacity-100" : "-translate-x-full motion-reduce:opacity-0",
          )}
        >
          <button
            type="button"
            onClick={close}
            aria-label={t.closeMenu}
            className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-sm text-white transition-colors hover:bg-white/10"
          >
            <X className="size-6" aria-hidden />
          </button>
          <SidebarContent {...props} onNavigate={close} />
        </div>
      </div>
    </>
  );
}
