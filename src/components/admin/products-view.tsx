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
import { AdminMain, Card, PageHead, smallButtonClasses, thClasses } from "./ui";

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

        <Card className="w-full p-2">
          <div className="relative w-full overflow-x-auto">
            <table aria-label={t.products.title} className="w-full min-w-[820px] border-separate border-spacing-0">
              <thead>
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
              <tbody className="[&_td]:shadow-[inset_0_-1px_0_var(--border-subtle)] [&_th]:shadow-[inset_0_-1px_0_var(--border-subtle)]">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[15px] leading-[23px] text-muted-foreground">
                      {t.products.empty}
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const from = p.variants[0]?.price;
                    return (
                      <tr key={p.id.toString()}>
                        <th scope="row" className="py-3 pl-4 text-left">
                          <span className="flex items-center gap-3">
                            <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-oat">
                              {p.imageUrl ? (
                                <Image src={p.imageUrl} alt="" fill sizes="40px" quality={100} className="object-cover" />
                              ) : null}
                            </span>
                            <span className="truncate text-[15px] leading-[23px] font-bold">{p.name}</span>
                          </span>
                        </th>
                        <td className="py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-pill px-2.5 py-1 text-xs leading-4 font-bold",
                              categoryStyle(p.category.slug).tint,
                            )}
                          >
                            {categoryName(p.category.slug, p.category.name, locale)}
                          </span>
                        </td>
                        <td className="py-3 text-[15px] leading-[23px] font-medium">{p.variants.length}</td>
                        <td className="py-3 text-[15px] leading-[23px] font-medium">
                          {from === undefined
                            ? "–"
                            : p.variants.length > 1
                              ? t.products.from(formatRupiah(from))
                              : formatRupiah(from)}
                        </td>
                        <td className="py-3">
                          <StatusBadge tone={p.isAvailable ? "success" : "muted"} className="whitespace-nowrap">
                            {p.isAvailable ? t.products.available : t.products.unavailable}
                          </StatusBadge>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <Link
                            href={`/admin/products/${p.id}/edit${qs}`}
                            scroll={false}
                            aria-label={t.products.editLabel(p.name)}
                            className={smallButtonClasses}
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
