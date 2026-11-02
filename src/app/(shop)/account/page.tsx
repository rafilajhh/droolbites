import type { Metadata } from "next";
import { ACCOUNT_TABS, AccountNav, type AccountTab } from "@/components/account/account-nav";
import { ORDER_FILTERS, type OrderFilter } from "@/components/account/account-orders";
import { AddressSection, ProfileSection } from "@/components/account/account-sections";
import { ActiveOrder } from "@/components/account/active-order";
import { OrderHistory } from "@/components/account/order-history";
import { SweetStats } from "@/components/account/sweet-stats";
import { getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { requireUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(accountMessages)).metaTitle, robots: { index: false } };
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0][0], words[words.length - 1][0]] : [words[0]?.[0] ?? "?"];
  return letters.join("").toUpperCase();
}

const pick = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;

/** pen: Account (tfSmS): one tab at a time (orders, account information, saved address). */
export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const query = await searchParams;
  const tab = pick<AccountTab>(query.tab, ACCOUNT_TABS, "orders");
  const filter = pick<OrderFilter>(query.status, ORDER_FILTERS, "all");
  const user = await requireUser(tab === "orders" ? "/account" : `/account?tab=${tab}`);
  const t = await getMessages(accountMessages);
  const firstName = user.fullName.trim().split(/\s+/)[0] || user.fullName;

  return (
    <>
      <div className="flex w-full flex-col gap-4 px-4 pt-8 pb-8 md:px-8 lg:px-16 lg:pt-12 lg:pb-10">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-pill bg-highlight font-display text-[22px] leading-none font-bold text-foreground sm:size-20 sm:text-[28px]"
            aria-hidden
          >
            {initials(user.fullName)}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-mono text-xs leading-normal font-semibold tracking-[1px] text-primary">{t.eyebrow}</p>
            <h1 className="font-display type-page font-bold break-words text-foreground">
              {t.hello(firstName)}
            </h1>
          </div>
        </div>
        {/* Indented to the greeting's text column (avatar 80px + 20px gap) from sm up. */}
        <SweetStats userId={user.id} className="sm:pl-25" />
      </div>
      <div className="flex w-full flex-col items-start gap-8 px-4 pb-20 md:px-8 lg:flex-row lg:gap-12 lg:px-16 lg:pb-28">
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:sticky lg:top-[88px] lg:w-[260px]">
          <AccountNav current={tab} />
        </aside>
        <div className="flex w-full min-w-0 flex-1 flex-col gap-8">
          {tab === "orders" ? (
            <>
              {filter === "all" ? <ActiveOrder userId={user.id} /> : null}
              <OrderHistory userId={user.id} filter={filter} />
            </>
          ) : tab === "profile" ? (
            <ProfileSection user={user} />
          ) : (
            <AddressSection user={user} />
          )}
        </div>
      </div>
    </>
  );
}
