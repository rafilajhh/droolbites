import type { Metadata } from "next";
import { CategoriesAddForm } from "@/components/admin/categories-add-form";
import { CategoriesTable, type CategoryRow } from "@/components/admin/categories-table";
import { AdminMain, PageHead } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMessages } from "@/i18n/server";
import { adminCategoriesMessages } from "@/i18n/messages/admin-categories";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(adminCategoriesMessages);
  return { title: t.metaTitle };
}

/** Admin / Categories: add, rename and delete the menu's categories (no pen frame; built from the Products page parts). */
export default async function AdminCategoriesPage() {
  await requireAdmin();
  const [t, categories, counts] = await Promise.all([
    getMessages(adminCategoriesMessages),
    db.category.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, slug: true } }),
    db.product.groupBy({ by: ["categoryId", "isAvailable"], _count: { _all: true } }),
  ]);

  const count = (categoryId: number, isAvailable: boolean) =>
    counts.find((c) => c.categoryId === categoryId && c.isAvailable === isAvailable)?._count._all ?? 0;
  const rows: CategoryRow[] = categories.map((c) => ({
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    visible: count(c.id, true),
    hidden: count(c.id, false),
  }));

  return (
    <AdminMain>
      <PageHead title={t.title} sub={t.sub} />
      <CategoriesAddForm />
      <CategoriesTable rows={rows} />
    </AdminMain>
  );
}
