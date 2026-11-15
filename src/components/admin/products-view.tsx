import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badges";
import { categoryName, productImageUrl } from "@/content/products";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getLocale, getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";
import { categoryStyle } from "./rules";
import { ProductsToolbar } from "./toolbars";
import { AdminMain, Card, CellLabel, listCardClasses, listThClasses, mobileCardRowClasses, PageHead, smallButtonClasses } from "./ui";

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
      slug: true,
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

        <Card className={listCardClasses}>
          <div className="relative w-full overflow-x-auto">
            <table
              aria-label={t.products.title}
              className="w-full border-separate border-spacing-0 max-xl:block xl:min-w-[820px]"
            >
              <thead className="max-xl:hidden">
                <tr>
                  <th scope="col" className={cn(listThClasses, "pl-4")}>
                    {c.product}
                  </th>
                  <th scope="col" className={cn(listThClasses, "w-[150px]")}>
                    {c.category}
                  </th>
                  <th scope="col" className={cn(listThClasses, "w-[90px]")}>
                    {c.options}
                  </th>
                  <th scope="col" className={cn(listThClasses, "w-[150px]")}>
                    {c.price}
                  </th>
                  <th scope="col" className={cn(listThClasses, "w-[150px]")}>
                    {c.availability}
                  </th>
                  <th scope="col" className={cn(listThClasses, "w-[96px] pr-4")}>
                    <span className="sr-only">{c.action}</span>
                  </th>
                </tr>
              </thead>
              {/* Below xl each row stacks its cells between hairlines; cells carry sr-only labels. */}
              <tbody className="max-xl:flex max-xl:flex-col xl:[&_tr:not(:last-child)_td]:shadow-[inset_0_-1px_0_var(--border-subtle)] xl:[&_tr:not(:last-child)_th]:shadow-[inset_0_-1px_0_var(--border-subtle)]">
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="block px-4 py-8 text-center text-[15px] leading-[23px] text-muted-foreground xl:table-cell"
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
                          className="py-3 pr-4 pl-4 text-left max-xl:order-1 max-xl:min-w-0 max-xl:grow max-xl:basis-[calc(100%-5rem)] max-xl:p-0"
                        >
                          <span className="flex items-center gap-3">
                            <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-oat">
                              <Image
                                src={productImageUrl(p.slug, p.imageUrl)}
                                alt=""
                                fill
                                sizes="40px"
                                quality={100}
                                className="object-cover"
                              />
                            </span>
                            <span className="truncate text-[15px] leading-[23px] font-bold max-xl:line-clamp-2 max-xl:whitespace-normal">
                              {p.name}
                            </span>
                          </span>
                        </th>
                        <td className="py-3 max-xl:order-3 max-xl:p-0">
                          <CellLabel until="xl">{c.category}</CellLabel>
                          <span
                            className={cn(
                              "inline-flex rounded-pill px-2.5 py-1 text-xs leading-4 font-bold",
                              categoryStyle(p.category.slug).tint,
                            )}
                          >
                            {categoryName(p.category.slug, p.category.name, locale)}
                          </span>
                        </td>
                        <td className="py-3 text-[15px] leading-[23px] font-medium max-xl:hidden">{p.variants.length}</td>
                        <td className="py-3 text-[15px] leading-[23px] font-medium max-xl:order-5 max-xl:basis-full max-xl:p-0 max-xl:text-sm max-xl:leading-[21px] max-xl:text-muted-foreground">
                          <CellLabel until="xl">{c.price}</CellLabel>
                          {from === undefined
                            ? "–"
                            : p.variants.length > 1
                              ? t.products.from(formatRupiah(from))
                              : formatRupiah(from)}
                          <span className="xl:hidden"> · {t.products.optionsCount(p.variants.length)}</span>
                        </td>
                        <td className="py-3 max-xl:order-4 max-xl:p-0">
                          <CellLabel until="xl">{c.availability}</CellLabel>
                          <StatusBadge tone={p.isAvailable ? "success" : "muted"} className="whitespace-nowrap">
                            {p.isAvailable ? t.products.available : t.products.unavailable}
                          </StatusBadge>
                        </td>
                        <td className="py-3 pr-4 text-right max-xl:order-2 max-xl:basis-[4.5rem] max-xl:p-0">
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
