import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badges";
import { categoryName } from "@/content/products";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getLocale, getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";
import { categoryStyle } from "./rules";
import { ProductsToolbar } from "./toolbars";
import { AdminMain, Card, CellLabel, mobileCardRowClasses, PageHead, smallButtonClasses, thClasses } from "./ui";

export type ProductsQuery = { q: string; category: string };

function one(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function readProductsQuery(params: Record<string, string | string[] | undefined>): ProductsQuery {
  return { q: one(params.q).trim().slice(0, 100), category: one(params.category).slice(0, 60) };
}

export function productsQueryString({ q, category }: ProductsQuery) {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (category) search.set("category", category);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * pen: Admin / Products (m4PdY) with the category (lKO4u) and search (toUdf)
 * states. The add/edit drawers render on top of this list.
 */
export async function ProductsView({ query, children }: { query: ProductsQuery; children?: React.ReactNode }) {
  const [t, locale] = await Promise.all([getMessages(adminMessages), getLocale()]);
  const categories = await db.category.findMany({ orderBy: { id: "asc" }, select: { slug: true, name: true } });
  const category = categories.some((c) => c.slug === query.category) ? query.category : "";

  const where: Prisma.ProductWhereInput = {
    ...(category ? { category: { slug: category } } : {}),
    ...(query.q ? { name: { contains: query.q } } : {}),
  };
  const products = await db.product.findMany({
    where,
    orderBy: [{ categoryId: "asc" }, { id: "asc" }],
    // Safety cap: the store has a handful of products and the pen frame has no pagination.
    take: 200,
    select: {
      id: true,
      name: true,
      imageUrl: true,
      isAvailable: true,
      category: { select: { slug: true, name: true } },
      variants: { select: { price: true }, orderBy: { price: "asc" } },
    },
  });

  const qs = productsQueryString({ q: query.q, category });
  const c = t.products.col;

  return (
    <>
      <AdminMain>
        <PageHead
          title={t.products.title}
          sub={t.products.sub}
          action={
            <ButtonLink href={`/admin/products/new${qs}`} scroll={false}>
              {t.products.add}
            </ButtonLink>
          }
        />
        <ProductsToolbar q={query.q} category={category} count={products.length} categories={categories} />

        <Card className="w-full p-2 max-md:bg-transparent max-md:p-0 max-md:inset-ring-0">
          <div className="relative w-full overflow-x-auto">
            <table
              aria-label={t.products.title}
              className="w-full border-separate border-spacing-0 max-md:block md:min-w-[820px]"
            >
              <thead className="max-md:hidden">
                <tr>
                  <th scope="col" className={cn(thClasses, "rounded-l-lg bg-background py-3 pl-4")}>
                    {c.product}
                  </th>
                  <th scope="col" className={cn(thClasses, "w-[150px] bg-background py-3")}>
                    {c.category}
                  </th>
                  <th scope="col" className={cn(thClasses, "w-[90px] bg-background py-3")}>
                    {c.options}
                  </th>
                  <th scope="col" className={cn(thClasses, "w-[150px] bg-background py-3")}>
                    {c.price}
                  </th>
                  <th scope="col" className={cn(thClasses, "w-[150px] bg-background py-3")}>
                    {c.availability}
                  </th>
                  <th scope="col" className={cn(thClasses, "w-[96px] rounded-r-lg bg-background py-3 pr-4")}>
                    <span className="sr-only">{c.action}</span>
                  </th>
                </tr>
              </thead>
              {/* Below md each row is a stacked card like the orders list; cells carry sr-only labels. */}
              <tbody className="max-md:flex max-md:flex-col max-md:gap-2 md:[&_tr:not(:last-child)_td]:shadow-[inset_0_-1px_0_var(--border-subtle)] md:[&_tr:not(:last-child)_th]:shadow-[inset_0_-1px_0_var(--border-subtle)]">
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="block px-4 py-8 text-center text-[15px] leading-[23px] text-muted-foreground md:table-cell"
                    >
                      {t.products.empty}
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const from = p.variants[0]?.price;
                    return (
                      <tr key={p.id.toString()} className={mobileCardRowClasses}>
                        <th
                          scope="row"
                          className="py-3 pr-4 pl-4 text-left max-md:order-1 max-md:min-w-0 max-md:grow max-md:basis-[calc(100%-5rem)] max-md:p-0"
                        >
                          <span className="flex items-center gap-3">
                            <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-oat">
                              {p.imageUrl ? (
                                <Image src={p.imageUrl} alt="" fill sizes="40px" quality={100} className="object-cover" />
                              ) : null}
                            </span>
                            <span className="truncate text-[15px] leading-[23px] font-bold max-md:line-clamp-2 max-md:whitespace-normal">
                              {p.name}
                            </span>
                          </span>
                        </th>
                        <td className="py-3 max-md:order-3 max-md:p-0">
                          <CellLabel>{c.category}</CellLabel>
                          <span
                            className={cn(
                              "inline-flex rounded-pill px-2.5 py-1 text-xs leading-4 font-bold",
                              categoryStyle(p.category.slug).tint,
                            )}
                          >
                            {categoryName(p.category.slug, p.category.name, locale)}
                          </span>
                        </td>
                        <td className="py-3 text-[15px] leading-[23px] font-medium max-md:hidden">{p.variants.length}</td>
                        <td className="py-3 text-[15px] leading-[23px] font-medium max-md:order-5 max-md:basis-full max-md:p-0 max-md:text-sm max-md:leading-[21px] max-md:text-muted-foreground">
                          <CellLabel>{c.price}</CellLabel>
                          {from === undefined
                            ? "–"
                            : p.variants.length > 1
                              ? t.products.from(formatRupiah(from))
                              : formatRupiah(from)}
                          <span className="md:hidden"> · {t.products.optionsCount(p.variants.length)}</span>
                        </td>
                        <td className="py-3 max-md:order-4 max-md:p-0">
                          <CellLabel>{c.availability}</CellLabel>
                          <StatusBadge tone={p.isAvailable ? "success" : "muted"} className="whitespace-nowrap">
                            {p.isAvailable ? t.products.available : t.products.unavailable}
                          </StatusBadge>
                        </td>
                        <td className="py-3 pr-4 text-right max-md:order-2 max-md:basis-[4.5rem] max-md:p-0">
                          <Link
                            href={`/admin/products/${p.id}/edit${qs}`}
                            scroll={false}
                            aria-label={t.products.editLabel(p.name)}
                            className={cn(smallButtonClasses, "relative after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']")}
                          >
                            {t.common.edit}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </AdminMain>
      {children}
    </>
  );
}
