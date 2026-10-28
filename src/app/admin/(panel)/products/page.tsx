import type { Metadata } from "next";
import { ProductsView, readProductsQuery } from "@/components/admin/products-view";
import { requireAdmin } from "@/lib/auth";
import { getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(adminMessages);
  return { title: t.meta.products };
}

/** pen: Admin / Products (m4PdY). */
export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  return <ProductsView query={readProductsQuery(await searchParams)} />;
}
