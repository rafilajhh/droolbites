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

/**
 * The account's tabs as one bar under the greeting, across the page's full width: each tab shows its
 * own panel (orders, account information, saved address); the current one carries a 2px moss
 * underline on the bar's hairline. Sign out is a quieter action at the bar's right end. Below sm the
 * three tabs share the row equally with short labels, and sign out keeps only its icon.
 */
export async function AccountNav({ current }: { current: AccountTab }) {
  const t = (await getMessages(accountMessages)).nav;
  const links: { tab: AccountTab; label: string; short: string; Icon: typeof Receipt }[] = [
    { tab: "orders", label: t.orders, short: t.short.orders, Icon: Receipt },
    { tab: "profile", label: t.info, short: t.short.info, Icon: User },
    { tab: "address", label: t.address, short: t.short.address, Icon: MapPin },
  ];

  return (
    <div className="flex w-full items-stretch gap-2 shadow-[inset_0_-1px_0_var(--border-subtle)]">
      <nav aria-label={t.label} className="min-w-0 flex-1">
        <ul className="grid grid-cols-3 sm:flex sm:gap-8">
          {links.map(({ tab, label, short, Icon }) => {
            const active = current === tab;
            return (
              <li key={tab} className="flex">
                <Link
                  href={tabHref(tab)}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 w-full items-center justify-center gap-2 text-[15px] leading-[23px] transition-colors motion-reduce:transition-none sm:justify-start",
                    active
                      ? "font-bold text-foreground shadow-[inset_0_-2px_0_var(--primary)]"
                      : "font-medium text-muted-foreground hover:text-foreground hover:shadow-[inset_0_-2px_0_var(--border-divider)]",
                  )}
                >
                  <Icon className={cn("size-[18px] shrink-0", active && "text-primary")} aria-hidden />
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
      <form action={signOut} className="flex shrink-0">
        <button
          type="submit"
          className="flex min-h-12 min-w-11 cursor-pointer items-center justify-center gap-2 text-sm leading-[21px] font-semibold text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none"
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          <span className="max-sm:sr-only">{t.signOut}</span>
        </button>
      </form>
    </div>
  );
}
