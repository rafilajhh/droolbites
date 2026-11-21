import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { ArrowLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badges";
import { Pagination } from "@/components/admin/pagination";
import { ORDER_PAGE_SIZE } from "@/components/admin/rules";
import { OrdersToolbar } from "@/components/admin/toolbars";
import { AdminMain, Card, CellLabel, listCardClasses, listScrollClasses, listThClasses, PageHead } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { containsText, db } from "@/lib/db";
import { formatDate, formatRupiah } from "@/lib/format";
import { fulfilmentBadgeInfo, needsActionWhere, overdueMinutes } from "@/lib/order-status";
import { orderPaymentInfo, payable, paymentStatusWhere } from "@/lib/orders";
import { shownPayment } from "@/lib/payments";
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
  // ?needs=action: paid orders waiting to be accepted or declined (the overview banner links here). It replaces the payment filter.
  const needsAction = one(params.needs) === "action";
  const statusParam = one(params.status);
  const status = !needsAction && STATUSES.includes(statusParam as PaymentStatus) ? (statusParam as PaymentStatus) : null;
  const page = Math.max(1, Math.floor(Number(one(params.page)) || 1));

  const [t, locale] = await Promise.all([getMessages(adminMessages), getLocale()]);

  const where: Prisma.OrderWhereInput = {
    ...(needsAction ? needsActionWhere : status ? await paymentStatusWhere(status) : {}),
    ...(q
      ? { OR: [{ orderNumber: containsText(q) }, { customerName: containsText(q) }, { email: containsText(q) }] }
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
      customerName: true,
      fulfilmentMethod: true,
      fulfilmentStatus: true,
      paymentStatus: true,
      createdAt: true,
      updatedAt: true,
      refundedAt: true,
      total: true,
      payments: { orderBy: { id: "desc" }, select: { status: true, chargedAmount: true, provider: true, paidAt: true } },
    },
  });
  const now = new Date();

  const c = t.orders.col;
  const cell = "py-3 text-[15px] leading-[23px] font-medium max-xl:p-0";
  const muted = "max-xl:text-sm max-xl:leading-[21px] max-xl:text-muted-foreground";
  // Below md a row stacks its cells (flex-wrap, placed with max-md:order-*). From md to xl, where the table
  // doesn't fit beside the sidebar yet, a row is four fixed tracks (so the columns line up from row to
  // row), each its own stack: number over customer, payment over date, status over "Waiting 45 min" over
  // method, total (and its fee) over View. Three row lines: the first line (23px), the notes, the second
  // line. Customer and date span the notes and the second line, so they sit right under their first line
  // whether a note is there or not; method and View follow the notes.
  // From xl the cells line up on their first line (baseline), so a "Waiting 5 d" under the status badge
  // hangs below the row's badges instead of lifting its own badge above the others.
  // Below xl the status cell is display: contents, so its badge and its waiting note are placed on their own:
  // below md the note gets a line of its own from the row's left edge.
  const row =
    "xl:align-baseline max-xl:py-4 max-xl:shadow-[inset_0_-1px_0_var(--border-subtle)] max-xl:last:shadow-none max-md:flex max-md:flex-wrap max-md:items-start max-md:gap-x-2 max-md:gap-y-2.5 md:max-xl:grid md:max-xl:grid-cols-[minmax(0,1fr)_168px_152px_112px] md:max-xl:grid-rows-[23px_auto_1fr] md:max-xl:items-start md:max-xl:gap-x-5 md:max-xl:gap-y-0";
  // A second-line cell from md to xl: 6px under the line (or the note) above it.
  const line2 = "md:max-xl:mt-1.5";

  return (
    <AdminMain>
      <PageHead title={t.orders.title} sub={t.orders.sub} />
      <OrdersToolbar q={q} status={status ?? ""} needsAction={needsAction} count={count} />

      <Card className={listCardClasses}>
        <div className={listScrollClasses}>
          <table aria-label={t.orders.title} className="w-full border-separate border-spacing-0 max-xl:block xl:min-w-[860px]">
            <thead className="max-xl:hidden">
              <tr>
                <th scope="col" className={cn(listThClasses, "w-[112px] pl-4 xl:max-[1400px]:w-[168px]")}>
                  {c.order}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[112px]")}>
                  {c.placed}
                </th>
                <th scope="col" className={cn(listThClasses, "xl:max-[1400px]:hidden")}>
                  {c.customer}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[124px] pr-3")}>
                  {c.method}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[148px] pr-3")}>
                  {c.payment}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[124px] pr-3")}>
                  {c.status}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[116px] pr-6 text-right")}>
                  {c.total}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[96px] pr-4")}>
                  <span className="sr-only">{c.action}</span>
                </th>
              </tr>
            </thead>
            {/* Below xl each row stacks its cells between hairlines; cells carry sr-only labels since the header row is hidden. */}
            <tbody className="max-xl:flex max-xl:flex-col xl:[&_tr:not(:last-child)_td]:shadow-[inset_0_-1px_0_var(--border-subtle)] xl:[&_tr:not(:last-child)_th]:shadow-[inset_0_-1px_0_var(--border-subtle)]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="block px-4 py-8 text-center xl:table-cell text-[15px] leading-[23px] text-muted-foreground">
                    {q || status || needsAction ? t.orders.empty : t.orders.emptyAll}
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const fs = fulfilmentBadgeInfo(order);
                  const ps = orderPaymentInfo(order);
                  // What the customer pays or paid (the same attempt as the order page), with the gateway's fee in it.
                  const payment = shownPayment(order.payments);
                  const pay = payable(order, payment);
                  const unpaid = order.paymentStatus !== "paid" && order.fulfilmentStatus === "pending";
                  // Paid and still not accepted past the half hour the customer was told to expect.
                  const waited =
                    order.paymentStatus === "paid" && order.fulfilmentStatus === "pending"
                      ? overdueMinutes(order.payments.find((p) => p.status === "paid")?.paidAt, now)
                      : null;
                  return (
                    <tr key={order.orderNumber} className={row}>
                      <th
                        scope="row"
                        className="py-3 pr-3 pl-4 text-left text-[15px] leading-[23px] font-bold whitespace-nowrap max-xl:order-1 max-xl:grow max-xl:basis-[55%] max-xl:p-0 md:max-xl:col-start-1 md:max-xl:row-start-1"
                      >
                        {order.orderNumber}
                        {/* From xl to 1400px the customer column doesn't fit yet: the name sits under the number. */}
                        <span className="hidden text-sm leading-[21px] font-medium whitespace-normal text-muted-foreground xl:max-[1400px]:block">
                          {order.customerName}
                        </span>
                      </th>
                      <td className={cn(cell, muted, line2, "max-xl:order-6 md:max-xl:col-start-2 md:max-xl:row-span-2 md:max-xl:row-start-2")}>
                        <CellLabel until="xl">{c.placed}</CellLabel>
                        {formatDate(order.createdAt, locale)}
                      </td>
                      <td className={cn(cell, line2, "pr-3 max-xl:order-5 max-xl:basis-full md:max-xl:col-start-1 md:max-xl:row-span-2 md:max-xl:row-start-2 md:max-xl:truncate xl:max-[1400px]:hidden")}>
                        <CellLabel until="xl">{c.customer}</CellLabel>
                        {order.customerName}
                      </td>
                      <td className={cn(cell, muted, line2, "pr-3 whitespace-nowrap max-xl:order-7 max-md:before:mr-2 max-md:before:content-['·'] md:max-xl:col-start-3 md:max-xl:row-start-3")}>
                        <CellLabel until="xl">{c.method}</CellLabel>
                        {order.fulfilmentMethod === "delivery" ? t.common.delivery : t.common.pickup}
                      </td>
                      <td className="py-3 pr-3 max-xl:order-3 max-xl:p-0 md:max-xl:col-start-2 md:max-xl:row-start-1">
                        <CellLabel until="xl">{c.payment}</CellLabel>
                        <Badge size="sm" tone={ps.tone}>{ps[locale]}</Badge>
                      </td>
                      <td className="py-3 pr-3 max-xl:contents">
                        <CellLabel until="xl">{c.status}</CellLabel>
                        {unpaid ? (
                          <span className="text-muted-foreground max-xl:order-4 max-md:hidden md:max-xl:col-start-3 md:max-xl:row-start-1" aria-label={fs[locale]}>
                            —
                          </span>
                        ) : (
                          <Badge size="sm" tone={fs.tone} className="max-xl:order-4 md:max-xl:col-start-3 md:max-xl:row-start-1">
                            {fs[locale]}
                          </Badge>
                        )}
                        {waited !== null ? (
                          <span className="mt-1 block text-[13px] leading-5 font-semibold text-error max-xl:order-4 max-md:-mt-1 max-md:basis-full md:max-xl:col-start-3 md:max-xl:row-start-2">
                            {t.orders.waiting(waited)}
                          </span>
                        ) : null}
                      </td>
                      <td className={cn(cell, "pr-6 text-right whitespace-nowrap tabular-nums max-xl:order-2 max-xl:grow max-xl:basis-[calc(45%-0.5rem)] max-xl:text-base max-xl:font-bold md:max-xl:col-start-4 md:max-xl:row-span-2 md:max-xl:row-start-1")}>
                        <CellLabel until="xl">{c.total}</CellLabel>
                        {formatRupiah(pay.amount)}
                        {pay.serviceFee > 0 ? (
                          <span className="block text-[13px] leading-5 font-medium text-muted-foreground max-xl:text-xs max-xl:leading-[18px] max-xl:whitespace-normal">
                            {t.orders.inclFee(formatRupiah(pay.serviceFee))}
                          </span>
                        ) : null}
                      </td>
                      <td className={cn(line2, "py-3 pr-4 text-right max-xl:order-8 max-xl:ml-auto max-xl:p-0 md:max-xl:col-start-4 md:max-xl:row-start-3")}>
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
