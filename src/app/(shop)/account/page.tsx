import type { Metadata } from "next";
import { Mail, MailCheck } from "lucide-react";
import { AccountAvatar } from "@/components/account/account-avatar";
import { ACCOUNT_TABS, AccountNav, type AccountTab } from "@/components/account/account-nav";
import { getOrderCounts, ORDER_FILTERS, ORDERS_PER_PAGE, type OrderFilter } from "@/components/account/account-orders";
import { AddressSection, ProfileSection } from "@/components/account/account-sections";
import { ActiveOrder } from "@/components/account/active-order";
import { OrderHistory } from "@/components/account/order-history";
import { SweetStats } from "@/components/account/sweet-stats";
import { getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(accountMessages)).metaTitle, robots: { index: false } };
}

const pick = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;

/** `?page=` of the order history: a whole number from 1 (the history clamps it to its last page). */
function pageParam(value: unknown) {
  const n = typeof value === "string" && /^\d{1,4}$/.test(value) ? Number(value) : 1;
  return Math.max(1, n);
}

/** pen: Account (tfSmS): one tab at a time (orders, account information, saved address). */
export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const query = await searchParams;
  const tab = pick<AccountTab>(query.tab, ACCOUNT_TABS, "orders");
  const filter = pick<OrderFilter>(query.status, ORDER_FILTERS, "all");
  const page = pageParam(query.page);

  // ?linked= from /account/claim: how many guest orders were added, or why none could be.
  const linked = typeof query.linked === "string" && /^(\d{1,4}|invalid|error)$/.test(query.linked) ? query.linked : null;
  // ?claim=1 after every password sign-up: guest orders placed with the email get a link by email.
  const claim = query.claim === "1";

  const back = new URLSearchParams();
  // Kept through sign-in, so the notice still shows after it.
  if (linked) back.set("linked", linked);
  else if (claim) back.set("claim", "1");
  if (tab !== "orders") back.set("tab", tab);
  else {
    if (filter !== "all") back.set("status", filter);
    if (page > 1) back.set("page", String(page));
  }
  const user = await requireUser(`/account${back.size ? `?${back}` : ""}`);
  const t = await getMessages(accountMessages);
  const firstName = user.fullName.trim().split(/\s+/)[0] || user.fullName;
  // The history shows its last page for a ?page= past the end, so the order in progress goes by that page.
  const pages = Math.max(1, Math.ceil((await getOrderCounts(user.id))[filter] / ORDERS_PER_PAGE));
  const firstPage = Math.min(page, pages) === 1;
  const linkedNotice =
    linked === null
      ? null
      : linked === "invalid" || linked === "error"
        ? { ok: false, text: t.linked[linked] }
        : { ok: true, text: Number(linked) > 0 ? t.linked.added(Number(linked)) : t.linked.none };
  const notice = linkedNotice ?? (claim ? { ok: true, text: t.linked.check, pending: true } : null);

  return (
    <>
      {/* The greeting, and the customer's orders so far beside it from xl (under it, aligned to its text, below). */}
      <div className="flex w-full flex-col gap-6 px-4 pt-8 pb-6 md:px-8 lg:px-16 lg:pt-12 lg:pb-8 xl:flex-row xl:items-center xl:justify-between xl:gap-12">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <AccountAvatar
            name={user.fullName}
            photo={user.avatarUrl}
            size={80}
            className="size-16 text-[22px] sm:size-20 sm:text-[28px]"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-mono text-xs leading-normal font-semibold tracking-[1px] text-primary">{t.eyebrow}</p>
            <h1 className="font-display type-page font-bold break-words text-foreground">{t.hello(firstName)}</h1>
          </div>
        </div>
        {/* Indented to the greeting's text column (avatar 80px + 20px gap) from sm until it moves beside it. */}
        <SweetStats userId={user.id} className="sm:pl-25 xl:shrink-0 xl:pl-0" />
      </div>
      {/* The tabs run as one bar under the greeting and the panel takes the full width below it. */}
      <div className="flex w-full flex-col gap-8 px-4 pb-20 md:px-8 lg:gap-10 lg:px-16 lg:pb-28">
        {notice ? (
          <p
            id="account-linked"
            role="status"
            className={cn(
              "flex w-full items-start gap-3 rounded-sm p-4 text-sm leading-normal text-foreground",
              notice.ok ? "bg-mint" : "bg-tint-salmon",
            )}
          >
            {"pending" in notice ? (
              <Mail className="size-5 shrink-0 text-primary" aria-hidden />
            ) : notice.ok ? (
              <MailCheck className="size-5 shrink-0 text-primary" aria-hidden />
            ) : null}
            <span className="flex-1 text-pretty">{notice.text}</span>
          </p>
        ) : null}
        <AccountNav current={tab} />
        <div className="flex w-full min-w-0 flex-col gap-12">
          {tab === "orders" ? (
            <>
              {filter === "all" && firstPage ? <ActiveOrder userId={user.id} /> : null}
              <OrderHistory userId={user.id} filter={filter} page={page} />
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
