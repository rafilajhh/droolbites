import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/badges";
import { ArrowLink, ButtonLink } from "@/components/ui/button";
import { ScrollFade } from "@/components/ui/scroll-fade";
import { photoFrame } from "@/components/ui/snapshot";
import { getLocale, getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { cn } from "@/lib/cn";
import { formatDate, formatItemCount, formatRupiah } from "@/lib/format";
import { awaitingConfirmationInfo, fulfilmentStatusInfo, paymentStatusInfo, statusLabel } from "@/lib/order-status";
import { accountTitleClasses } from "./account-card";
import {
  getAccountOrders,
  getOrderCounts,
  itemNames,
  ORDER_FILTERS,
  ORDERS_PER_PAGE,
  type AccountOrder,
  type OrderFilter,
} from "./account-orders";

/** Unpaid orders show the payment state; a paid one waits for the shop to accept it; then the kitchen state. */
function orderStatus(order: AccountOrder) {
  if (order.fulfilmentStatus !== "cancelled" && order.paymentStatus !== "paid") return paymentStatusInfo[order.paymentStatus];
  if (order.fulfilmentStatus === "pending") return awaitingConfirmationInfo;
  return fulfilmentStatusInfo[order.fulfilmentStatus];
}

/**
 * Order history, flat on the page: heading and filters (all / in progress / completed / cancelled) on
 * one line, then a hairline table with the first item's photo and a link to each order's page (where
 * an unpaid one is paid and a completed one ordered again). Columns size to their content and the items
 * column takes the rest. A table at desktop, stacked rows on phones. Ten orders a page (`?page=`, kept
 * with the filter; choosing a filter starts again at page 1), paged by the database.
 */
export async function OrderHistory({ userId, filter, page }: { userId: bigint; filter: OrderFilter; page: number }) {
  const [counts, t, locale] = await Promise.all([getOrderCounts(userId), getMessages(accountMessages), getLocale()]);
  const o = t.orders;
  const pages = Math.max(1, Math.ceil(counts[filter] / ORDERS_PER_PAGE));
  const current = Math.min(Math.max(1, page), pages);
  const orders = await getAccountOrders(userId, filter, current);

  // What was in it ("2 × Chocolate Chunk, Fudgy Brownies 15 × 15"), and under it the count and how it gets to the customer.
  const summary = (order: AccountOrder) => {
    const items = order.items.reduce((sum, item) => sum + item.qty, 0);
    return {
      names: itemNames(order).join(", "),
      meta: `${formatItemCount(items, locale)} · ${order.fulfilmentMethod === "delivery" ? o.delivery : o.pickup}`,
    };
  };

  const th =
    "pb-3 text-left align-top font-mono text-xs leading-normal font-semibold tracking-[0.5px] text-muted-foreground shadow-[inset_0_-1px_0_var(--border-subtle)]";
  const td = "xl:py-4 xl:align-middle xl:shadow-[inset_0_-1px_0_var(--border-subtle)]";
  const heading = (
    <h2 id="order-history-title" className={accountTitleClasses}>
      {o.title}
    </h2>
  );
  // Stacked rows (below xl) have no visible header row, so each cell carries its label for screen readers.
  const cellLabel = (label: string) => <span className="sr-only xl:hidden">{label}: </span>;

  // No orders at all: the cart's empty state (centred cookie, title, one line, one primary button).
  if (counts.all === 0) {
    return (
      <section
        id="order-history"
        aria-labelledby="order-history-title"
        className="flex w-full scroll-mt-[88px] flex-col items-center gap-3 py-12 text-center lg:py-16"
      >
        <h2 id="order-history-title" className="sr-only">
          {o.title}
        </h2>
        <span className={cn(photoFrame, "mb-3 size-24 shrink-0 rounded-pill bg-oat")} aria-hidden>
          <Image src="/images/products/chocolate-chunk.png" alt="" fill sizes="96px" className="object-cover" />
        </span>
        <p className="font-display text-2xl leading-[29px] font-semibold text-foreground">{o.emptyTitle}</p>
        <p className="max-w-[360px] text-[15px] leading-[23px] text-pretty text-muted-foreground">{o.empty}</p>
        <ButtonLink href="/menu" className="mt-3">
          {o.emptyCta}
        </ButtonLink>
      </section>
    );
  }

  return (
    <section id="order-history" aria-labelledby="order-history-title" className="flex w-full scroll-mt-[88px] flex-col gap-5">
      <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {heading}
        {/* Below sm the filters scroll sideways in one row instead of wrapping, the edge fading while more is that way. */}
        <ScrollFade as="nav" aria-label={o.filter} className="max-sm:-mx-4 max-sm:px-4 max-sm:py-1 sm:overflow-x-visible">
          <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {ORDER_FILTERS.map((f) => {
              const current = f === filter;
              return (
                <li key={f}>
                  <Link
                    href={f === "all" ? "/account#order-history" : `/account?status=${f}#order-history`}
                    scroll={false}
                    aria-current={current ? "true" : undefined}
                    className={cn(
                      "relative inline-flex h-9 items-center gap-2 rounded-pill px-4 whitespace-nowrap text-sm leading-[18px] font-semibold transition-colors after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] motion-reduce:transition-none",
                      current ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:inset-ring-[1.25px] hover:inset-ring-border",
                    )}
                  >
                    {o.filters[f]}
                    <span className={cn("font-mono text-xs tabular-nums", current ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {counts[f]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </ScrollFade>
      </div>

      {orders.length === 0 ? (
        <p className="text-[15px] leading-[23px] text-muted-foreground">{o.emptyFilter}</p>
      ) : (
        <table className="w-full border-collapse">
          <thead className="hidden xl:table-header-group">
            <tr>
              <th scope="col" className={cn(th, "pr-6")}>
                {o.order}
              </th>
              <th scope="col" className={cn(th, "w-full pr-6")}>
                {o.items}
              </th>
              <th scope="col" className={cn(th, "pr-6")}>
                {o.status}
              </th>
              <th scope="col" className={cn(th, "pr-6 text-right")}>
                {o.total}
              </th>
              <th scope="col" className={th}>
                <span className="sr-only">{o.details}</span>
              </th>
            </tr>
          </thead>
          <tbody className="block xl:table-row-group">
            {orders.map((order) => {
              const status = orderStatus(order);
              return (
                <tr
                  key={order.orderNumber}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 py-4 shadow-[inset_0_-1px_0_var(--border-subtle)] first:pt-0 xl:table-row xl:py-0 xl:shadow-none"
                >
                  <th scope="row" className={cn(td, "col-span-2 row-start-1 text-left font-normal whitespace-nowrap xl:pr-6")}>
                    <span className="flex items-center gap-3.5">
                      <span className={cn(photoFrame, "size-[52px] shrink-0 rounded-sm bg-card")}>
                        {order.imageUrl ? (
                          <Image src={order.imageUrl} alt="" fill sizes="52px" quality={100} className="object-cover" />
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-base leading-6 font-bold text-foreground">{order.orderNumber}</span>
                        <span className="text-sm leading-[21px] text-muted-foreground">
                          <span className="sr-only">{o.date}: </span>
                          {formatDate(order.createdAt, locale)}
                        </span>
                      </span>
                    </span>
                  </th>
                  <td className={cn(td, "col-span-3 row-start-2 text-[15px] leading-[23px] text-foreground xl:pr-6")}>
                    {cellLabel(o.items)}
                    <span className="line-clamp-1">{summary(order).names}</span>
                    <span className="block text-sm leading-[21px] text-muted-foreground">{summary(order).meta}</span>
                  </td>
                  <td className={cn(td, "col-span-2 row-start-3 whitespace-nowrap xl:pr-6")}>
                    {cellLabel(o.status)}
                    <StatusBadge tone={status.tone}>{statusLabel(status, locale)}</StatusBadge>
                  </td>
                  <td className={cn(td, "col-start-3 row-start-1 text-right text-base leading-normal font-bold whitespace-nowrap text-foreground tabular-nums xl:pr-6")}>
                    {cellLabel(o.total)}
                    {formatRupiah(order.amount)}
                  </td>
                  <td className={cn(td, "col-start-3 row-start-3 text-right whitespace-nowrap")}>
                    <ArrowLink href={`/orders/${order.orderNumber}`} aria-label={o.detailsFor(order.orderNumber)}>
                      {o.details}
                    </ArrowLink>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {pages > 1 ? (
        <Pagination
          filter={filter}
          current={current}
          pages={pages}
          showing={o.showing((current - 1) * ORDERS_PER_PAGE + 1, (current - 1) * ORDERS_PER_PAGE + orders.length, counts[filter])}
          labels={o}
        />
      ) : null}
    </section>
  );
}

function pageHref(filter: OrderFilter, page: number) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/account${query ? `?${query}` : ""}#order-history`;
}

/** 1 … 4 5 6 … 12: the first and last page, and the pages around the current one. */
function pageList(current: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const around = [current - 1, current, current + 1].filter((n) => n > 1 && n < pages);
  const list: (number | "gap")[] = [1];
  if (around[0] > 2) list.push("gap");
  list.push(...around);
  if (around[around.length - 1] < pages - 1) list.push("gap");
  list.push(pages);
  return list;
}

/**
 * Under the table: which orders are shown on the left, then previous, the page numbers (the current
 * one a moss pill, like the filters) and next. Previous/next at either end stay in place, dimmed.
 */
function Pagination({
  filter,
  current,
  pages,
  showing,
  labels,
}: {
  filter: OrderFilter;
  current: number;
  pages: number;
  showing: string;
  labels: { pages: string; prev: string; next: string; page: (n: number) => string };
}) {
  const pill =
    "relative inline-flex h-9 min-w-9 items-center justify-center rounded-pill px-2.5 text-sm leading-[18px] font-semibold tabular-nums transition-colors after:absolute after:-inset-1 after:content-[''] motion-reduce:transition-none";
  const idle = "bg-card text-foreground hover:inset-ring-[1.25px] hover:inset-ring-border";
  const step = (to: number, label: string, Icon: typeof ChevronLeft, edge: boolean) =>
    edge ? (
      <span aria-disabled="true" className={cn(pill, "bg-card text-muted-foreground opacity-50")}>
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{label}</span>
      </span>
    ) : (
      <Link href={pageHref(filter, to)} scroll={false} rel={to < current ? "prev" : "next"} className={cn(pill, idle)}>
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{label}</span>
      </Link>
    );

  return (
    <nav aria-label={labels.pages} className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <p className="text-sm leading-[21px] text-muted-foreground tabular-nums">{showing}</p>
      <ul className="flex flex-wrap items-center gap-2">
        <li>{step(current - 1, labels.prev, ChevronLeft, current === 1)}</li>
        {pageList(current, pages).map((n, i) =>
          n === "gap" ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-sm text-muted-foreground">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={pageHref(filter, n)}
                scroll={false}
                aria-label={labels.page(n)}
                aria-current={n === current ? "page" : undefined}
                className={cn(pill, n === current ? "bg-primary text-primary-foreground" : idle)}
              >
                {n}
              </Link>
            </li>
          ),
        )}
        <li>{step(current + 1, labels.next, ChevronRight, current === pages)}</li>
      </ul>
    </nav>
  );
}
