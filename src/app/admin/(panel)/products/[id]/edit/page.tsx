import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDrawer } from "@/components/admin/product-drawer";
import { ProductsView, productsQueryString, readProductsQuery } from "@/components/admin/products-view";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";

async function loadProduct(id: string) {
  if (!/^\d{1,18}$/.test(id)) return null;
  return db.product.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true,
      name: true,
      categoryId: true,
      description: true,
      isAvailable: true,
      imageUrl: true,
      variants: {
        orderBy: [{ price: "asc" }, { id: "asc" }],
        select: { id: true, name: true, price: true, _count: { select: { orderItems: true } } },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/admin/products/[id]/edit">): Promise<Metadata> {
  const [{ id }, t] = await Promise.all([params, getMessages(adminMessages)]);
  const product = await loadProduct(id);
  return { title: product ? t.meta.editProduct(product.name) : t.meta.products };
}

/** pen: Admin / Edit product (Z3eYvb) and its delete dialog (IBiDA). */
export default async function AdminEditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]/edit">) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const product = await loadProduct(id);
  if (!product) notFound();

  const query = readProductsQuery(sp);
  const categories = await db.category.findMany({ orderBy: { id: "asc" }, select: { id: true, slug: true, name: true } });

  return (
    <ProductsView query={query}>
      <ProductDrawer
        key={product.id.toString()}
        categories={categories.map((c) => ({ ...c, id: String(c.id) }))}
        closeHref={`/admin/products${productsQueryString(query)}`}
        product={{
          id: product.id.toString(),
          name: product.name,
          categoryId: String(product.categoryId),
          description: product.description ?? "",
          isAvailable: product.isAvailable,
          imageUrl: product.imageUrl,
          hasOrders: product.variants.some((v) => v._count.orderItems > 0),
          variants: product.variants.map((v) => ({
            id: v.id.toString(),
            name: v.name,
            price: v.price,
            inUse: v._count.orderItems > 0,
          })),
        }}
      />
    </ProductsView>
  );
}
