import Link from "next/link";
import { LogOut, MapPin, Receipt, User } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { cn } from "@/lib/cn";

export const ACCOUNT_TABS = ["orders", "profile", "address"] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function tabHref(tab: AccountTab) {
  return tab === "orders" ? "/account" : `/account?tab=${tab}`;
}

/** Below lg the three tabs sit in one row with the icon above the label; from lg a vertical list. */
const itemClass =
  "flex w-full flex-col items-center gap-1 rounded-sm px-2 py-2.5 text-center text-[13px] leading-[18px] text-foreground transition-colors hover:bg-card motion-reduce:transition-none sm:text-[15px] sm:leading-[23px] lg:flex-row lg:gap-3 lg:px-4 lg:py-3.5 lg:text-left";

/**
 * pen: Side Nav (ThhBD), as tabs: each one shows its own panel (orders, account information, saved
 * address) instead of scrolling one long page. Sign out is a quieter text action under the tabs.
 */
export async function AccountNav({ current }: { current: AccountTab }) {
  const t = (await getMessages(accountMessages)).nav;
  const links: { tab: AccountTab; label: string; short: string; Icon: typeof Receipt }[] = [
    { tab: "orders", label: t.orders, short: t.short.orders, Icon: Receipt },
    { tab: "profile", label: t.info, short: t.short.info, Icon: User },
    { tab: "address", label: t.address, short: t.short.address, Icon: MapPin },
  ];

  return (
    <div className="flex w-full gap-1 lg:flex-col lg:gap-3">
      <nav aria-label={t.label} className="min-w-0 flex-1">
        <ul className="grid grid-cols-3 gap-1 lg:flex lg:flex-col">
          {links.map(({ tab, label, short, Icon }) => {
            const active = current === tab;
            return (
              <li key={tab}>
                <Link
                  href={tabHref(tab)}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(itemClass, active ? "bg-card font-bold" : "font-medium")}
                >
                  <Icon className={cn("size-5 shrink-0", active ? "text-primary" : "text-foreground")} aria-hidden />
                  <span className="sm:hidden" aria-hidden>
                    {short}
                  </span>
                  <span className="max-sm:sr-only">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <form action={signOut} className="flex max-lg:shrink-0 lg:pt-3 lg:shadow-[inset_0_1px_0_var(--border-subtle)]">
        <button
          type="submit"
          className="flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm px-3 text-[13px] leading-[18px] font-semibold text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none lg:flex-row lg:gap-2 lg:px-4 lg:text-sm lg:leading-normal"
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {t.signOut}
        </button>
      </form>
    </div>
  );
}
