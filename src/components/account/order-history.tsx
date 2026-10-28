import { ArrowLink, ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badges";
import { getLocale, getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatDate, formatItemCount, formatRupiah } from "@/lib/format";
import { fulfilmentStatusInfo, paymentStatusInfo, statusLabel } from "@/lib/order-status";
import { AccountCard } from "./account-card";

type OrderRow = Awaited<ReturnType<typeof getOrders>>[number];

function getOrders(userId: bigint) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      orderNumber: true,
      createdAt: true,
      total: true,
      fulfilmentMethod: true,
      paymentStatus: true,
      fulfilmentStatus: true,
      items: {
        select: { qty: true, variant: { select: { name: true, product: { select: { name: true } } } } },
      },
    },
  });
}

/** Unpaid orders show the payment state; otherwise the kitchen/fulfilment state. */
function orderStatus(order: OrderRow) {
  if (order.fulfilmentStatus !== "cancelled" && order.paymentStatus !== "paid") return paymentStatusInfo[order.paymentStatus];
  return fulfilmentStatusInfo[order.fulfilmentStatus];
}

/** Size variants ("20 × 20 cm") are shown without the unit; "1 piece"/"1 portion" are left out. */
function sizeSuffix(variantName: string) {
  if (/^1 (piece|portion)$/.test(variantName)) return "";
  return ` ${variantName.replace(/\s*cm$/, "")}`;
}

/** pen: Order history card (W2AkM): a table at desktop, stacked rows on phones. */
export async function OrderHistory({ userId }: { userId: bigint }) {
  const [orders, t, locale] = await Promise.all([getOrders(userId), getMessages(accountMessages), getLocale()]);
  const o = t.orders;

  // One line: "Fudgy Brownies 20 × 20". Several: "6 items · Local delivery" (as drawn in the pen).
  const summary = (order: OrderRow) => {
    const [first] = order.items;
    if (order.items.length === 1 && first) {
      return `${first.qty > 1 ? `${first.qty} × ` : ""}${first.variant.product.name}${sizeSuffix(first.variant.name)}`;
    }
    const count = order.items.reduce((sum, item) => sum + item.qty, 0);
    return `${formatItemCount(count, locale)} · ${order.fulfilmentMethod === "delivery" ? o.delivery : o.pickup}`;
  };

  const th =
    "pb-3 text-left align-top font-mono text-xs leading-normal font-semibold tracking-[0.5px] text-muted-foreground shadow-[inset_0_-1px_0_var(--border-subtle)]";
  const td = "xl:py-4 xl:align-middle xl:shadow-[inset_0_-1px_0_var(--border-subtle)]";
  // Stacked rows (below xl) have no visible header row, so each cell carries its label for screen readers.
  const cellLabel = (label: string) => <span className="sr-only xl:hidden">{label}: </span>;

  return (
    <AccountCard id="order-history" title={o.title} sub={o.sub}>
      {orders.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-[15px] leading-[23px] text-foreground">{o.empty}</p>
          <ButtonLink href="/menu" variant="secondary">
            {o.emptyCta}
          </ButtonLink>
        </div>
      ) : (
        <table className="w-full table-fixed border-collapse">
          <thead className="hidden xl:table-header-group">
            <tr>
              <th scope="col" className={cn(th, "w-[140px]")}>
                {o.order}
              </th>
              <th scope="col" className={cn(th, "w-[140px]")}>
                {o.date}
              </th>
              <th scope="col" className={th}>
                {o.items}
              </th>
              <th scope="col" className={cn(th, "w-[200px]")}>
                {o.status}
              </th>
              <th scope="col" className={cn(th, "w-[130px]")}>
                {o.total}
              </th>
              <th scope="col" className={cn(th, "w-[110px]")}>
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
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-4 shadow-[inset_0_-1px_0_var(--border-subtle)] first:pt-0 xl:table-row xl:py-0 xl:shadow-none"
                >
                  <th scope="row" className={cn(td, "col-start-1 row-start-1 text-left text-base leading-normal font-bold text-foreground")}>
                    {order.orderNumber}
                  </th>
                  <td className={cn(td, "col-start-1 row-start-2 text-[15px] leading-[23px] text-foreground")}>
                    {cellLabel(o.date)}
                    {formatDate(order.createdAt, locale)}
                  </td>
                  <td className={cn(td, "col-span-2 row-start-3 text-[15px] leading-[23px] text-muted-foreground xl:pr-4")}>
                    {cellLabel(o.items)}
                    {summary(order)}
                  </td>
                  <td className={cn(td, "col-start-1 row-start-4")}>
                    {cellLabel(o.status)}
                    <StatusBadge tone={status.tone}>{statusLabel(status, locale)}</StatusBadge>
                  </td>
                  <td
                    className={cn(
                      td,
                      "col-start-2 row-start-1 text-right text-base leading-normal font-bold text-foreground xl:text-left",
                    )}
                  >
                    {cellLabel(o.total)}
                    {formatRupiah(order.total)}
                  </td>
                  <td className={cn(td, "col-start-2 row-start-4 text-right")}>
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
    </AccountCard>
  );
}
