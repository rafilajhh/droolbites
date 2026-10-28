"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { X } from "lucide-react";
import { suggestOrders } from "@/app/actions/admin/orders";
import { suggestProducts } from "@/app/actions/admin/products";
import { categoryName } from "@/content/products";
import { useLocale, useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { paymentStatusInfo } from "@/lib/order-status";
import { Dropdown, FilterFace, toolbarFieldClasses, type DropdownOption } from "./dropdown";
import { categoryStyle } from "./rules";
import { ResultText, SearchPopover } from "./search-popover";

function buildUrl(base: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

function Count({ children, pending }: { children: React.ReactNode; pending: boolean }) {
  return (
    <p
      className={cn(
        "ml-auto font-mono text-[13px] leading-5 font-semibold text-muted-foreground transition-opacity",
        pending && "opacity-50",
      )}
      aria-live="polite"
    >
      {children}
    </p>
  );
}

/** pen: Admin / Orders → Toolbar (search, payment filter, count). */
export function OrdersToolbar({
  q,
  status,
  needsAction = false,
  count,
}: {
  q: string;
  status: string;
  /** ?needs=action is on: paid orders that are still in progress. */
  needsAction?: boolean;
  count: number;
}) {
  const t = useMessages(adminMessages);
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (params: { q?: string; status?: string; needs?: string }) =>
    startTransition(() => router.push(buildUrl("/admin/orders", params)));

  const options: DropdownOption[] = [
    { value: "", label: t.orders.all },
    { value: "awaiting", label: paymentStatusInfo.awaiting[locale] },
    { value: "paid", label: paymentStatusInfo.paid[locale] },
    { value: "expired", label: paymentStatusInfo.expired[locale] },
  ];
  // "Needs action" is a subset of paid orders, so the payment filter reads "Paid" while it is on.
  const current = options.find((o) => o.value === (needsAction ? "paid" : status)) ?? options[0];

  const fetchItems = useCallback(
    async (query: string) =>
      (await suggestOrders(query)).map((o) => ({
        key: o.orderNumber,
        href: `/admin/orders/${o.orderNumber}`,
        content: (
          <ResultText
            name={o.orderNumber}
            sub={`${o.customerName} · ${formatRupiah(o.total)} · ${paymentStatusInfo[o.paymentStatus][locale]}`}
          />
        ),
      })),
    [locale],
  );

  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <SearchPopover
        label={t.orders.searchLabel}
        placeholder={t.orders.searchPlaceholder}
        query={q}
        fetchItems={fetchItems}
        onSubmit={(next) => go({ q: next, status, needs: needsAction ? "action" : undefined })}
      />
      <Dropdown
        label={t.orders.filterLabel}
        options={options}
        value={current.value}
        onChange={(next) => go({ q, status: next })}
        trigger={<FilterFace label={t.orders.payment} value={current.label} />}
        triggerClassName={toolbarFieldClasses}
        panelClassName="w-[260px]"
      />
      {needsAction ? (
        <button
          type="button"
          onClick={() => go({ q })}
          aria-label={t.orders.clearNeedsAction}
          className="flex min-h-11 items-center gap-2 rounded-pill bg-tint-mustard py-2 pr-3 pl-4 text-sm leading-[21px] font-semibold text-foreground transition-colors hover:bg-highlight"
        >
          {t.orders.needsAction}
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
      <Count pending={pending}>{t.orders.count(count)}</Count>
    </div>
  );
}

/** pen: Admin / Products → Toolbar (search, category filter, count). */
export function ProductsToolbar({
  q,
  category,
  count,
  categories,
}: {
  q: string;
  category: string;
  count: number;
  categories: { slug: string; name: string }[];
}) {
  const t = useMessages(adminMessages);
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (params: { q?: string; category?: string }) =>
    startTransition(() => router.push(buildUrl("/admin/products", params)));

  const options: DropdownOption[] = [
    { value: "", label: t.products.all, dot: "bg-primary" },
    ...categories.map((c) => ({
      value: c.slug,
      label: categoryName(c.slug, c.name, locale),
      dot: categoryStyle(c.slug).dot,
    })),
  ];
  const current = options.find((o) => o.value === category) ?? options[0];

  const fetchItems = useCallback(
    async (query: string) =>
      (await suggestProducts(query)).map((p) => ({
        key: p.id,
        href: `/admin/products/${p.id}/edit`,
        content: (
          <>
            <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-oat">
              {p.imageUrl ? (
                <Image src={p.imageUrl} alt="" fill sizes="40px" quality={100} className="object-cover" />
              ) : null}
            </span>
            <ResultText
              name={p.name}
              sub={[
                categoryName(p.categorySlug, p.categoryName, locale),
                p.fromPrice === null
                  ? null
                  : p.variantCount > 1
                    ? t.products.from(formatRupiah(p.fromPrice))
                    : formatRupiah(p.fromPrice),
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </>
        ),
      })),
    [locale, t.products],
  );

  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <SearchPopover
        label={t.products.searchLabel}
        placeholder={t.products.searchPlaceholder}
        query={q}
        fetchItems={fetchItems}
        onSubmit={(next) => go({ q: next, category })}
      />
      <Dropdown
        label={t.products.filterLabel}
        options={options}
        value={current.value}
        onChange={(next) => go({ q, category: next })}
        trigger={<FilterFace label={t.products.category} value={current.label} />}
        triggerClassName={toolbarFieldClasses}
        panelClassName="w-[260px]"
      />
      <Count pending={pending}>{t.products.count(count)}</Count>
    </div>
  );
}
