"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { commonMessages } from "@/i18n/messages/common";
import { LanguageSwitch } from "./language-switch";
import { useShopUI } from "./shop-ui";

const iconLink =
  "relative flex size-10 items-center justify-center rounded-pill transition-colors after:absolute after:-inset-0.5 after:content-[''] hover:bg-card";

export function HeaderBar({ cartCount, accountHref }: { cartCount: number; accountHref: string }) {
  const t = useMessages(commonMessages).header;
  const { open } = useShopUI();

  return (
    // Sticky and always compact (56 / 64px with a hairline): it never changes size on scroll.
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between bg-background px-4 shadow-[inset_0_-1px_0_var(--border-subtle)] md:h-16 md:px-8">
      <div className="flex flex-1 items-center">
        <button
          type="button"
          className={`${iconLink} -ml-[9px]`}
          onClick={() => open("menu")}
          aria-label={t.openMenu}
          aria-haspopup="dialog"
        >
          <Menu className="size-[22px]" aria-hidden />
        </button>
      </div>

      <Link href="/" aria-label={t.home} className="shrink-0 rounded-pill">
        <Image
          src="/images/site/logo-badge.png"
          alt="Droolbites"
          width={48}
          height={48}
          quality={100}
          priority
          className="size-11 rounded-pill object-cover md:size-12"
        />
      </Link>

      {/* 40px icons with 44px hit areas; gaps chosen so the icons sit 20px apart like the pen header. */}
      <div className="flex flex-1 items-center justify-end gap-0.5">
        <LanguageSwitch className="mr-3 hidden sm:inline-flex" />
        <button
          type="button"
          className={`${iconLink} hidden sm:flex`}
          onClick={() => open("search")}
          aria-label={t.search}
          aria-haspopup="dialog"
        >
          <Search className="size-[22px]" aria-hidden />
        </button>
        <Link href={accountHref} className={iconLink} aria-label={t.account}>
          <User className="size-[22px]" aria-hidden />
        </Link>
        <button
          type="button"
          className={`${iconLink} -mr-[5px] ml-1`}
          onClick={() => open("cart")}
          aria-label={`${t.cart}, ${t.cartCount(cartCount)}`}
          aria-haspopup="dialog"
        >
          <span className="relative block h-7 w-[30px]">
            <ShoppingBag className="absolute top-1 left-0 size-[22px]" aria-hidden />
            {cartCount > 0 ? (
              <span className="absolute top-0 left-3 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-highlight px-[3px] text-[10px] leading-none font-bold text-ink tabular-nums">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </span>
        </button>
      </div>
    </header>
  );
}
