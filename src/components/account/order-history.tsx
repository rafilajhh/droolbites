import Image from "next/image";
import Link from "next/link";
import { ReorderButton } from "@/components/checkout/reorder-button";
import { StatusBadge } from "@/components/ui/badges";
import { ArrowLink, ButtonLink } from "@/components/ui/button";
import { photoFrame } from "@/components/ui/snapshot";
import { getLocale, getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { cn } from "@/lib/cn";
import { formatDate, formatItemCount, formatRupiah } from "@/lib/format";
import { awaitingConfirmationInfo, fulfilmentStatusInfo, paymentStatusInfo, statusLabel } from "@/lib/order-status";
import { AccountCard } from "./account-card";
import { getAccountOrders, itemNames, ORDER_FILTERS, type AccountOrder, type OrderFilter } from "./account-orders";

/** Unpaid orders show the payment state; a paid one waits for the shop to accept it; then the kitchen state. */
function orderStatus(order: AccountOrder) {
  if (order.fulfilmentStatus !== "cancelled" && order.paymentStatus !== "paid") return paymentStatusInfo[order.paymentStatus];
  if (order.fulfilmentStatus === "pending") return awaitingConfirmationInfo;
  return fulfilmentStatusInfo[order.fulfilmentStatus];
}

/**
 * pen: Order history card (W2AkM), with filters (all / in progress / completed / cancelled), the
 * first item's photo, and the next thing to do on each order: pay an unpaid one, order a completed
 * one again. A table at desktop, stacked rows on phones.
 */
export async function OrderHistory({ userId, filter }: { userId: bigint; filter: OrderFilter }) {
  const [all, t, locale] = await Promise.all([getAccountOrders(userId), getMessages(accountMessages), getLocale()]);
  const o = t.orders;
  const count = (f: OrderFilter) => (f === "all" ? all.length : all.filter((order) => order.bucket === f).length);
  const orders = filter === "all" ? all : all.filter((order) => order.bucket === filter);

  // One line: "Fudgy Brownies 20 × 20". Several: "Fudgy Brownies 20 × 20 + 2 more" style via the item count.
  const summary = (order: AccountOrder) => {
    const names = itemNames(order);
    if (names.length === 1) return names[0];
    const items = order.items.reduce((sum, item) => sum + item.qty, 0);
    return `${formatItemCount(items, locale)} · ${order.fulfilmentMethod === "delivery" ? o.delivery : o.pickup}`;
  };

  const th =
    "pb-3 text-left align-top font-mono text-xs leading-normal font-semibold tracking-[0.5px] text-muted-foreground shadow-[inset_0_-1px_0_var(--border-subtle)]";
  const td = "xl:py-4 xl:align-middle xl:shadow-[inset_0_-1px_0_var(--border-subtle)]";
  // Stacked rows (below xl) have no visible header row, so each cell carries its label for screen readers.
  const cellLabel = (label: string) => <span className="sr-only xl:hidden">{label}: </span>;

  if (all.length === 0) {
    return (
      <AccountCard id="order-history" title={o.title}>
        <div className="flex flex-col items-start gap-4">
          <p className="text-[15px] leading-[23px] text-foreground">{o.empty}</p>
          <ButtonLink href="/menu" variant="secondary">
            {o.emptyCta}
          </ButtonLink>
        </div>
      </AccountCard>
    );
  }

  return (
    <AccountCard id="order-history" title={o.title}>
      <nav aria-label={o.filter} className="-mt-1">
        <ul className="flex flex-wrap gap-2">
          {ORDER_FILTERS.map((f) => {
            const current = f === filter;
            return (
              <li key={f}>
                <Link
                  href={f === "all" ? "/account#order-history" : `/account?status=${f}#order-history`}
                  scroll={false}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative inline-flex h-9 items-center gap-2 rounded-pill px-4 text-sm leading-[18px] font-semibold transition-colors after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] motion-reduce:transition-none",
                    current ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:inset-ring-[1.25px] hover:inset-ring-border",
                  )}
                >
                  {o.filters[f]}
                  <span className={cn("font-mono text-xs tabular-nums", current ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {count(f)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <p className="text-[15px] leading-[23px] text-muted-foreground">{o.emptyFilter}</p>
      ) : (
        <table className="w-full table-fixed border-collapse">
          <thead className="hidden xl:table-header-group">
            <tr>
              <th scope="col" className={cn(th, "w-[230px]")}>
                {o.order}
              </th>
              <th scope="col" className={th}>
                {o.items}
              </th>
              <th scope="col" className={cn(th, "w-[190px]")}>
                {o.status}
              </th>
              <th scope="col" className={cn(th, "w-[120px]")}>
                {o.total}
              </th>
              <th scope="col" className={cn(th, "w-[190px]")}>
                <span className="sr-only">{o.details}</span>
              </th>
            </tr>
          </thead>
          <tbody className="block xl:table-row-group">
            {orders.map((order) => {
              const status = orderStatus(order);
              const unpaid = order.paymentStatus === "awaiting";
              return (
                <tr
                  key={order.orderNumber}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 py-4 shadow-[inset_0_-1px_0_var(--border-subtle)] first:pt-0 xl:table-row xl:py-0 xl:shadow-none"
                >
                  <th scope="row" className={cn(td, "col-span-2 row-start-1 text-left font-normal xl:pr-4")}>
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
                  <td className={cn(td, "col-span-3 row-start-2 text-[15px] leading-[23px] text-foreground xl:pr-4")}>
                    {cellLabel(o.items)}
                    {summary(order)}
                  </td>
                  <td className={cn(td, "col-span-2 row-start-3")}>
                    {cellLabel(o.status)}
                    <StatusBadge tone={status.tone}>{statusLabel(status, locale)}</StatusBadge>
                  </td>
                  <td className={cn(td, "col-start-3 row-start-1 text-right text-base leading-normal font-bold text-foreground xl:text-left")}>
                    {cellLabel(o.total)}
                    {formatRupiah(order.total)}
                  </td>
                  <td className={cn(td, "col-start-3 row-start-3")}>
                    <span className="flex items-center justify-end gap-5">
                      {unpaid ? (
                        <ArrowLink href={`/checkout/pay/${order.orderNumber}`} aria-label={o.payFor(order.orderNumber)} className="text-primary">
                          {o.pay}
                        </ArrowLink>
                      ) : order.bucket === "completed" ? (
                        <ReorderButton
                          orderNumber={order.orderNumber}
                          token=""
                          label={o.again}
                          pendingLabel={o.againPending}
                          failedLabel={o.againFailed}
                          variant="link"
                        />
                      ) : null}
                      <ArrowLink href={`/orders/${order.orderNumber}`} aria-label={o.detailsFor(order.orderNumber)}>
                        {o.details}
                      </ArrowLink>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </AccountCard>
  );
}
