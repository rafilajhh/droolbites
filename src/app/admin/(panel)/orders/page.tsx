import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { ArrowLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badges";
import { Pagination } from "@/components/admin/pagination";
import { ORDER_PAGE_SIZE } from "@/components/admin/rules";
import { OrdersToolbar } from "@/components/admin/toolbars";
import { AdminMain, Card, CellLabel, mobileCardRowClasses, PageHead, thClasses } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatRupiah } from "@/lib/format";
import { fulfilmentBadgeInfo, needsActionWhere, paymentStatusInfo } from "@/lib/order-status";
import { cn } from "@/lib/cn";
import { getLocale, getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(adminMessages);
  return { title: t.meta.orders };
}

const STATUSES: PaymentStatus[] = ["awaiting", "paid", "expired"];

function one(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** pen: Admin / Orders (RmK1t), with the filter (R7RuuQ) and search (Qw34v) states. */
export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const params = await searchParams;
  const q = one(params.q).trim().slice(0, 100);
  // ?needs=action: paid orders still in progress (the overview banner links here). It replaces the payment filter.
  const needsAction = one(params.needs) === "action";
  const statusParam = one(params.status);
  const status = !needsAction && STATUSES.includes(statusParam as PaymentStatus) ? (statusParam as PaymentStatus) : null;
  const page = Math.max(1, Math.floor(Number(one(params.page)) || 1));

  const [t, locale] = await Promise.all([getMessages(adminMessages), getLocale()]);

  const where: Prisma.OrderWhereInput = {
    ...(needsAction ? needsActionWhere : status ? { paymentStatus: status } : {}),
    ...(q
      ? { OR: [{ orderNumber: { contains: q } }, { customerName: { contains: q } }, { email: { contains: q } }] }
      : {}),
  };
  const count = await db.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(count / ORDER_PAGE_SIZE));
  const href = (p: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (status) search.set("status", status);
    if (needsAction) search.set("needs", "action");
    if (p > 1) search.set("page", String(p));
    const qs = search.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };
  if (page > totalPages) redirect(href(totalPages));

  const orders = await db.order.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * ORDER_PAGE_SIZE,
    take: ORDER_PAGE_SIZE,
    select: {
      orderNumber: true,
      createdAt: true,
      customerName: true,
      fulfilmentMethod: true,
      fulfilmentStatus: true,
      paymentStatus: true,
      total: true,
    },
  });

  const c = t.orders.col;
  const cell = "py-3 text-[15px] leading-[23px] font-medium max-md:p-0";
  const muted = "max-md:text-sm max-md:leading-[21px] max-md:text-muted-foreground";

  return (
    <AdminMain>
      <PageHead title={t.orders.title} sub={t.orders.sub} />
      <OrdersToolbar q={q} status={status ?? ""} needsAction={needsAction} count={count} />

      <Card className="w-full p-2 max-md:bg-transparent max-md:p-0 max-md:inset-ring-0">
        <div className="relative w-full overflow-x-auto">
          <table aria-label={t.orders.title} className="w-full border-separate border-spacing-0 max-md:block md:min-w-[900px]">
            <thead className="max-md:hidden">
              <tr>
                <th scope="col" className={cn(thClasses, "w-[136px] rounded-l-lg bg-background py-3 pl-4")}>
                  {c.order}
                </th>
                <th scope="col" className={cn(thClasses, "w-[130px] bg-background py-3")}>
                  {c.placed}
                </th>
                <th scope="col" className={cn(thClasses, "bg-background py-3")}>
                  {c.customer}
                </th>
                <th scope="col" className={cn(thClasses, "w-[130px] bg-background py-3 pr-3")}>
                  {c.method}
                </th>
                <th scope="col" className={cn(thClasses, "w-[110px] bg-background py-3 pr-3")}>
                  {c.payment}
                </th>
                <th scope="col" className={cn(thClasses, "w-[140px] bg-background py-3 pr-3")}>
                  {c.status}
                </th>
                <th scope="col" className={cn(thClasses, "w-[110px] bg-background py-3 pr-3")}>
                  {c.total}
                </th>
                <th scope="col" className={cn(thClasses, "w-[96px] rounded-r-lg bg-background py-3 pr-4")}>
                  <span className="sr-only">{c.action}</span>
                </th>
              </tr>
            </thead>
            {/* Below md each row is a stacked card; cells carry sr-only labels since the header row is hidden. */}
            <tbody className="max-md:flex max-md:flex-col max-md:gap-2 md:[&_tr:not(:last-child)_td]:shadow-[inset_0_-1px_0_var(--border-subtle)] md:[&_tr:not(:last-child)_th]:shadow-[inset_0_-1px_0_var(--border-subtle)]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="block px-4 py-8 text-center md:table-cell text-[15px] leading-[23px] text-muted-foreground">
                    {q || status || needsAction ? t.orders.empty : t.orders.emptyAll}
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const fs = fulfilmentBadgeInfo(order);
                  const ps = paymentStatusInfo[order.paymentStatus];
                  const unpaid = order.paymentStatus !== "paid" && order.fulfilmentStatus === "pending";
                  return (
                    <tr key={order.orderNumber} className={mobileCardRowClasses}>
                      <th
                        scope="row"
                        className="py-3 pr-3 pl-4 text-left text-[15px] leading-[23px] font-bold whitespace-nowrap max-md:order-1 max-md:grow max-md:basis-[55%] max-md:p-0"
                      >
                        {order.orderNumber}
                      </th>
                      <td className={cn(cell, muted, "max-md:order-6")}>
                        <CellLabel>{c.placed}</CellLabel>
                        {formatDate(order.createdAt, locale)}
                      </td>
                      <td className={cn(cell, "pr-3 max-md:order-5 max-md:basis-full")}>
                        <CellLabel>{c.customer}</CellLabel>
                        {order.customerName}
                      </td>
                      <td className={cn(cell, muted, "pr-3 whitespace-nowrap max-md:order-7 max-md:before:mr-2 max-md:before:content-['·']")}>
                        <CellLabel>{c.method}</CellLabel>
                        {order.fulfilmentMethod === "delivery" ? t.common.delivery : t.common.pickup}
                      </td>
                      <td className="py-3 pr-3 max-md:order-3 max-md:p-0">
                        <CellLabel>{c.payment}</CellLabel>
                        <StatusBadge tone={ps.tone} className="whitespace-nowrap">{ps[locale]}</StatusBadge>
                      </td>
                      <td className="py-3 pr-3 max-md:order-4 max-md:p-0">
                        <CellLabel>{c.status}</CellLabel>
                        {unpaid ? (
                          <span className="text-muted-foreground" aria-label={fs[locale]}>—</span>
                        ) : (
                          <StatusBadge tone={fs.tone} className="whitespace-nowrap">{fs[locale]}</StatusBadge>
                        )}
                      </td>
                      <td className={cn(cell, "pr-3 whitespace-nowrap max-md:order-2 max-md:grow max-md:basis-[calc(45%-0.5rem)] max-md:text-right max-md:text-base max-md:font-bold")}>
                        <CellLabel>{c.total}</CellLabel>
                        {formatRupiah(order.total)}
                      </td>
                      <td className="py-3 pr-4 text-right max-md:order-8 max-md:ml-auto max-md:p-0">
                        <ArrowLink
                          href={`/admin/orders/${order.orderNumber}`}
                          aria-label={t.orders.viewLabel(order.orderNumber)}
                          className="after:-inset-y-4"
                        >
                          {t.common.view}
                        </ArrowLink>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination
        page={page}
        totalPages={totalPages}
        href={href}
        labels={{
          previous: t.common.previous,
          next: t.common.next,
          page: t.common.page(page, totalPages),
          nav: t.common.pagination,
        }}
      />
    </AdminMain>
  );
}
