import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { ArrowLink } from "@/components/ui/button";
import { CustomersSearch } from "@/components/admin/customers-search";
import { Pagination } from "@/components/admin/pagination";
import { SegmentedLinks } from "@/components/admin/reports-segmented";
import { AdminMain, Card, CellLabel, listCardClasses, listThClasses, mobileCardRowClasses, PageHead } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatRupiah } from "@/lib/format";
import { keptOrderWhere } from "@/lib/reports";
import { cn } from "@/lib/cn";
import { getLocale, getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";
import { adminCustomersMessages } from "@/i18n/messages/admin-customers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(adminCustomersMessages);
  return { title: t.metaTitle };
}

const PAGE_SIZE = 20;

function one(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

type Tab = "customers" | "newsletter";

/** Admin / Customers: customer accounts (?tab=customers) and newsletter sign-ups (?tab=newsletter). Read-only. */
export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin();
  const params = await searchParams;
  const tab: Tab = one(params.tab) === "newsletter" ? "newsletter" : "customers";
  const q = one(params.q).trim().slice(0, 100);
  const page = Math.max(1, Math.floor(Number(one(params.page)) || 1));

  const [t, admin, locale] = await Promise.all([
    getMessages(adminCustomersMessages),
    getMessages(adminMessages),
    getLocale(),
  ]);

  const customerWhere: Prisma.UserWhereInput = { role: "customer" };
  const [customerTotal, subscriberTotal] = await Promise.all([
    db.user.count({ where: customerWhere }),
    db.newsletterSubscriber.count(),
  ]);

  const href = (p: number, next: { tab?: Tab; q?: string } = {}) => {
    const search = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    const nextQ = next.q ?? q;
    if (nextTab !== "customers") search.set("tab", nextTab);
    if (nextQ) search.set("q", nextQ);
    if (p > 1) search.set("page", String(p));
    const qs = search.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  };

  const tabs = (
    <SegmentedLinks
      label={t.tabs.label}
      value={tab}
      options={[
        { value: "customers", label: t.tabs.customers, href: href(1, { tab: "customers", q: "" }), count: customerTotal },
        { value: "newsletter", label: t.tabs.newsletter, href: href(1, { tab: "newsletter", q: "" }), count: subscriberTotal },
      ]}
    />
  );
  const pagination = (totalPages: number) => (
    <Pagination
      page={page}
      totalPages={totalPages}
      href={href}
      labels={{
        previous: admin.common.previous,
        next: admin.common.next,
        page: admin.common.page(page, totalPages),
        nav: admin.common.pagination,
      }}
    />
  );
  const toolbar = (count: string) => (
    <div className="flex w-full flex-wrap items-center gap-3">
      <CustomersSearch
        q={q}
        tab={tab === "customers" ? null : tab}
        label={tab === "customers" ? t.search.customersLabel : t.search.newsletterLabel}
        placeholder={tab === "customers" ? t.search.customersPlaceholder : t.search.newsletterPlaceholder}
      />
      <p className="ml-auto font-mono text-[13px] leading-5 font-semibold text-muted-foreground" aria-live="polite">
        {count}
      </p>
    </div>
  );
  const cell = "py-3 text-[15px] leading-[23px] font-medium max-xl:p-0";
  const muted = "max-xl:text-sm max-xl:leading-[21px] max-xl:text-muted-foreground";
  const emptyCell = "block px-4 py-8 text-center text-[15px] leading-[23px] text-muted-foreground xl:table-cell";

  if (tab === "newsletter") {
    const where: Prisma.NewsletterSubscriberWhereInput = q ? { email: { contains: q } } : {};
    const count = q ? await db.newsletterSubscriber.count({ where }) : subscriberTotal;
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
    if (page > totalPages) redirect(href(totalPages));
    const subscribers = await db.newsletterSubscriber.findMany({
      where,
      orderBy: [{ subscribedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, email: true, subscribedAt: true },
    });

    return (
      <AdminMain>
        <PageHead title={t.title} sub={t.sub} />
        {tabs}
        {toolbar(t.subscriberCount(count))}
        <Card className="w-full p-2">
          <table aria-label={t.tabs.newsletter} className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th scope="col" className={cn(listThClasses, "pr-3 pl-4")}>
                  {t.col.email}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[140px] pr-4 sm:w-[180px]")}>
                  {t.col.subscribed}
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:not(:last-child)_td]:shadow-[inset_0_-1px_0_var(--border-subtle)] [&_tr:not(:last-child)_th]:shadow-[inset_0_-1px_0_var(--border-subtle)]">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={2} className={cn(emptyCell, "table-cell")}>
                    {q ? t.newsletterEmpty : t.newsletterEmptyAll}
                  </td>
                </tr>
              ) : (
                subscribers.map((s) => (
                  <tr key={String(s.id)}>
                    <th scope="row" className="py-3 pr-3 pl-4 text-left text-[15px] leading-[23px] font-semibold [overflow-wrap:anywhere]">
                      {s.email}
                    </th>
                    <td className="py-3 pr-4 text-[15px] leading-[23px] font-medium whitespace-nowrap tabular-nums">
                      {formatDate(s.subscribedAt, locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
        {pagination(totalPages)}
        <p className="text-[13px] leading-5 text-muted-foreground">{t.newsletterNote}</p>
      </AdminMain>
    );
  }

  const where: Prisma.UserWhereInput = {
    ...customerWhere,
    ...(q ? { OR: [{ fullName: { contains: q } }, { email: { contains: q } }] } : {}),
  };
  const count = q ? await db.user.count({ where }) : customerTotal;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (page > totalPages) redirect(href(totalPages));

  // Only display fields; the password hash is never read (a separate query only asks whether one exists).
  const customers = await db.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: { id: true, fullName: true, email: true, googleId: true, createdAt: true },
  });
  const ids = customers.map((c) => c.id);
  const [withPassword, orderStats, spentStats] = ids.length
    ? await Promise.all([
        db.user.findMany({ where: { id: { in: ids }, passwordHash: { not: null } }, select: { id: true } }),
        db.order.groupBy({
          by: ["userId"],
          where: { userId: { in: ids } },
          _count: { _all: true },
          _max: { createdAt: true },
        }),
        db.order.groupBy({ by: ["userId"], where: { userId: { in: ids }, ...keptOrderWhere }, _sum: { total: true } }),
      ])
    : [[], [], []];
  const hasPassword = new Set(withPassword.map((u) => String(u.id)));
  const ordersBy = new Map(orderStats.map((s) => [String(s.userId), { count: s._count._all, last: s._max.createdAt }]));
  const spentBy = new Map(spentStats.map((s) => [String(s.userId), s._sum.total ?? 0]));

  const c = t.col;

  return (
    <AdminMain>
      <PageHead title={t.title} sub={t.sub} />
      {tabs}
      {toolbar(t.count(count))}

      <Card className={listCardClasses}>
        <div className="relative w-full overflow-x-auto">
          <table aria-label={t.tabs.customers} className="w-full border-separate border-spacing-0 max-xl:block xl:min-w-[860px]">
            <thead className="max-xl:hidden">
              <tr>
                <th scope="col" className={cn(listThClasses, "pr-3 pl-4")}>
                  {c.customer}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[120px] pr-3")}>
                  {c.signIn}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[112px] pr-3")}>
                  {c.joined}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[72px] pr-3 text-right")}>
                  {c.orders}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[120px] pr-3 text-right")}>
                  {c.spent}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[140px] pr-3 pl-8")}>
                  {c.lastOrder}
                </th>
                <th scope="col" className={cn(listThClasses, "w-[96px] pr-4")}>
                  <span className="sr-only">{c.action}</span>
                </th>
              </tr>
            </thead>
            {/* Below xl each row stacks its cells (name and email, then a meta line); cells carry labels since the header row is hidden. */}
            <tbody className="max-xl:flex max-xl:flex-col xl:[&_tr:not(:last-child)_td]:shadow-[inset_0_-1px_0_var(--border-subtle)] xl:[&_tr:not(:last-child)_th]:shadow-[inset_0_-1px_0_var(--border-subtle)]">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className={emptyCell}>
                    {q ? t.empty : t.emptyAll}
                  </td>
                </tr>
              ) : (
                customers.map((u) => {
                  const key = String(u.id);
                  const orders = ordersBy.get(key);
                  const password = hasPassword.has(key);
                  const signIn = u.googleId
                    ? password
                      ? t.signIn.both
                      : t.signIn.google
                    : password
                      ? t.signIn.password
                      : t.signIn.none;
                  return (
                    <tr key={key} className={mobileCardRowClasses}>
                      <th
                        scope="row"
                        className="py-3 pr-3 pl-4 text-left align-middle font-normal max-xl:order-1 max-xl:min-w-0 max-xl:basis-full max-xl:p-0"
                      >
                        <span className="block text-[15px] leading-[23px] font-bold">{u.fullName}</span>
                        <span className="block text-sm leading-[21px] [overflow-wrap:anywhere] text-muted-foreground max-xl:truncate">{u.email}</span>
                      </th>
                      <td className={cn(cell, muted, "pr-3 max-xl:order-3")}>
                        <CellLabel until="xl">{c.signIn}</CellLabel>
                        {signIn}
                      </td>
                      <td className={cn(cell, muted, "pr-3 whitespace-nowrap max-xl:order-6 max-xl:basis-full")}>
                        <span className="max-xl:hidden">{formatDate(u.createdAt, locale)}</span>
                        <span className="xl:hidden">
                          {c.joined}: {formatDate(u.createdAt, locale)}
                        </span>
                      </td>
                      <td className={cn(cell, muted, "pr-3 tabular-nums xl:text-right max-xl:order-4 max-xl:before:mr-2 max-xl:before:content-['·']")}>
                        <span className="max-xl:hidden">{orders?.count ?? 0}</span>
                        <span className="xl:hidden">{t.orderCount(orders?.count ?? 0)}</span>
                      </td>
                      <td className={cn(cell, "pr-3 text-right whitespace-nowrap tabular-nums max-xl:order-5 max-xl:text-sm max-xl:leading-[21px] max-xl:font-bold max-xl:before:mr-2 max-xl:before:font-normal max-xl:before:text-muted-foreground max-xl:before:content-['·']")}>
                        <CellLabel until="xl">{c.spent}</CellLabel>
                        {formatRupiah(spentBy.get(key) ?? 0)}
                      </td>
                      <td className={cn(cell, muted, "pr-3 whitespace-nowrap max-xl:order-7 xl:pl-8")}>
                        <span className="xl:hidden">{c.lastOrder}: </span>
                        {orders?.last ? (
                          formatDate(orders.last, locale)
                        ) : (
                          <>
                            <span aria-hidden>—</span>
                            <span className="sr-only">{t.noOrders}</span>
                          </>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right max-xl:order-8 max-xl:ml-auto max-xl:p-0">
                        <ArrowLink
                          href={`/admin/orders?q=${encodeURIComponent(u.email)}`}
                          aria-label={t.viewOrdersLabel(u.fullName)}
                          className="after:-inset-y-4"
                        >
                          {t.viewOrders}
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

      {pagination(totalPages)}
      <p className="text-[13px] leading-5 text-muted-foreground">{t.note}</p>
    </AdminMain>
  );
}
