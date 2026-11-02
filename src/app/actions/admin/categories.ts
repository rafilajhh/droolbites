"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

export type CategoryErrorKey = "name" | "taken" | "notFound" | "generic";

export type CategoryResult = { status: "saved"; name: string } | { status: "error"; error: CategoryErrorKey };

export type DeleteCategoryResult = { status: "deleted" | "in-use" | "failed" };

const idSchema = z.string().regex(/^\d{1,9}$/);
const nameSchema = z.string().trim().min(2).max(50);

/** categories.slug is VarChar(60); a "-2" suffix still has to fit. */
const SLUG_MAX = 60;

function errorCode(error: unknown) {
  return (error as { code?: string } | null)?.code;
}

async function uniqueSlug(name: string, ownId: number | null) {
  const base = slugify(name, { maxLength: SLUG_MAX, fallback: "category" });
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? "" : `-${n}`;
    const slug = `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/, "")}${suffix}`;
    const taken = await db.category.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === ownId) return slug;
  }
}

/** Shared by add and rename: validate, check the name is free, then write. */
async function saveCategory(ownId: number | null, rawName: unknown): Promise<CategoryResult> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { status: "error", error: "name" };
  const name = parsed.data;

  // Case-insensitive on purpose, whatever the column collation: "Brownies" and "brownies" are one category.
  const all = await db.category.findMany({ select: { id: true, name: true } });
  const own = ownId === null ? null : all.find((c) => c.id === ownId);
  if (ownId !== null && !own) return { status: "error", error: "notFound" };
  if (all.some((c) => c.id !== ownId && c.name.toLowerCase() === name.toLowerCase())) {
    return { status: "error", error: "taken" };
  }
  if (own && own.name === name) return { status: "saved", name };

  try {
    // The slug is set once, at creation: menu links, the home page sections and size labels key on it,
    // so a rename changes only the name people see.
    if (ownId === null) await db.category.create({ data: { name, slug: await uniqueSlug(name, null) } });
    else await db.category.update({ where: { id: ownId }, data: { name } });
  } catch (error) {
    const code = errorCode(error);
    // P2002: another save took the name or slug in the meantime. P2025: the category was deleted.
    if (code === "P2002") return { status: "error", error: "taken" };
    if (code === "P2025") return { status: "error", error: "notFound" };
    console.error("saveCategory failed", error);
    return { status: "error", error: "generic" };
  }

  // Layout-wide on purpose: categories feed the menu, search overlay, landing page and product drawer.
  revalidatePath("/", "layout");
  return { status: "saved", name };
}

/** Add a category. Its slug comes from the name, like product slugs. */
export async function createCategory(name: string): Promise<CategoryResult> {
  await requireAdmin();
  return saveCategory(null, name);
}

/** Rename a category. Its slug (and every /menu?category= link) stays as it was. */
export async function renameCategory(categoryId: string, name: string): Promise<CategoryResult> {
  await requireAdmin();
  if (!idSchema.safeParse(categoryId).success) return { status: "error", error: "notFound" };
  return saveCategory(Number(categoryId), name);
}

/**
 * Hard delete, refused while any product (shown or hidden) still belongs to
 * the category. The count and delete share a transaction; the products FK
 * (ON DELETE RESTRICT) also refuses if a product sneaks in between.
 */
export async function deleteCategory(categoryId: string): Promise<DeleteCategoryResult> {
  await requireAdmin();
  if (!idSchema.safeParse(categoryId).success) return { status: "failed" };
  const id = Number(categoryId);

  let result: DeleteCategoryResult;
  try {
    result = await db.$transaction(async (tx) => {
      const products = await tx.product.count({ where: { categoryId: id } });
      if (products > 0) return { status: "in-use" } as const;
      await tx.category.delete({ where: { id } });
      return { status: "deleted" } as const;
    });
  } catch (error) {
    const code = errorCode(error);
    if (code === "P2003") return { status: "in-use" };
    // P2025: already gone (deleted in another tab), which is what the admin asked for.
    if (code === "P2025") result = { status: "deleted" };
    else {
      console.error("deleteCategory failed", error);
      return { status: "failed" };
    }
  }

  if (result.status === "deleted") revalidatePath("/", "layout");
  return result;
}
