"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { useMessages } from "@/i18n/client";
import { commonMessages } from "@/i18n/messages/common";
import { LanguageSwitch } from "./language-switch";
import { useShopUI } from "./shop-ui";

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return scrolled;
}

const iconLink =
  "relative flex size-10 items-center justify-center rounded-pill transition-colors after:absolute after:-inset-0.5 after:content-[''] hover:bg-card";

export function HeaderBar({ cartCount, accountHref }: { cartCount: number; accountHref: string }) {
  const t = useMessages(commonMessages).header;
  const { open } = useShopUI();
  const scrolled = useScrolled();

  return (
    // Sticky: stays at the top while scrolling. At the top of the page it is the
    // pen header (72 / 100px). Once scrolled it condenses to 56 / 64px with a hairline;
    // the bottom margin gives the difference back so the page below never jumps.
    <header
      className={cn(
        "sticky top-0 z-30 flex h-[72px] w-full items-center justify-between bg-background px-4 transition-[height,margin,box-shadow] duration-200 motion-reduce:transition-none md:h-[100px] md:px-8",
        scrolled && "mb-4 h-14 shadow-[inset_0_-1px_0_var(--border-subtle)] md:mb-9 md:h-16",
      )}
    >
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
          width={76}
          height={76}
          quality={100}
          priority
          className={cn(
            "size-14 rounded-pill object-cover transition-[width,height] duration-200 motion-reduce:transition-none md:size-[76px]",
            scrolled && "size-11 md:size-12",
          )}
        />
      </Link>

      {/* 40px icons with 44px hit areas; gaps chosen so the icons sit 20px apart like the pen header. */}
      <div className="flex flex-1 items-center justify-end gap-0.5">
        <LanguageSwitch className="mr-3 hidden sm:inline-flex" />
        <Link href="/menu?search=1" className={`${iconLink} hidden sm:flex`} aria-label={t.search}>
          <Search className="size-[22px]" aria-hidden />
        </Link>
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
