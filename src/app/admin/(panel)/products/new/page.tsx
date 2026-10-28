import type { Metadata } from "next";
import { ProductDrawer } from "@/components/admin/product-drawer";
import { ProductsView, productsQueryString, readProductsQuery } from "@/components/admin/products-view";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(adminMessages);
  return { title: t.meta.addProduct };
}

/** pen: Admin / Add product (AxKj6) — the add drawer over the product list. */
export default async function AdminNewProductPage({ searchParams }: PageProps<"/admin/products/new">) {
  await requireAdmin();
  const query = readProductsQuery(await searchParams);
  const categories = await db.category.findMany({ orderBy: { id: "asc" }, select: { id: true, slug: true, name: true } });

  return (
    <ProductsView query={query}>
      <ProductDrawer
        categories={categories.map((c) => ({ ...c, id: String(c.id) }))}
        closeHref={`/admin/products${productsQueryString(query)}`}
      />
    </ProductsView>
  );
}
