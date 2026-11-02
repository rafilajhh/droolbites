"use server";

import { randomUUID } from "node:crypto";
import { unlink, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { MAX_UPLOAD_BYTES, sniffImageType, UPLOAD_TYPES } from "@/components/admin/rules";

export type ProductErrorKey =
  | "name"
  | "category"
  | "description"
  | "sizes"
  | "sizeName"
  | "sizePrice"
  | "sizeDuplicate"
  | "sizeInUse"
  | "photoType"
  | "photoSize"
  | "generic"
  | "notFound";

export type ProductFormState = {
  status: "idle" | "error";
  errors: {
    name?: ProductErrorKey;
    categoryId?: ProductErrorKey;
    description?: ProductErrorKey;
    photo?: ProductErrorKey;
    sizes?: ProductErrorKey;
    rows?: Record<number, { name?: ProductErrorKey; price?: ProductErrorKey }>;
    form?: ProductErrorKey;
  };
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const idSchema = z.string().regex(/^\d{1,18}$/);

const productSchema = z.object({
  name: z.string().trim().min(1).max(100),
  categoryId: z.coerce.number().int().positive(),
  description: z.string().trim().max(255),
  isAvailable: z.boolean(),
  variants: z
    .array(
      z.object({
        id: z.union([idSchema, z.literal("")]),
        name: z.string().trim().min(1).max(50),
        price: z.number().int().positive().max(100_000_000),
      }),
    )
    .min(1),
});

async function uniqueSlug(name: string, ownId: bigint | null) {
  const base = slugify(name);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const taken = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === ownId) return slug;
  }
}

async function removeUpload(imageUrl: string | null | undefined) {
  if (!imageUrl?.startsWith("/uploads/")) return;
  await unlink(path.join(UPLOAD_DIR, path.basename(imageUrl))).catch(() => {});
}

/** Create (no id) or update a product with its variants and optional new photo. */
export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const errors: ProductFormState["errors"] = {};

  const rawId = String(formData.get("id") ?? "");
  // A tampered id must never fall through to creating a new product.
  if (rawId && !idSchema.safeParse(rawId).success) return { status: "error", errors: { form: "notFound" } };
  const productId = rawId ? BigInt(rawId) : null;

  const ids = formData.getAll("variantId").map(String);
  const names = formData.getAll("variantName").map(String);
  const prices = formData.getAll("variantPrice").map((p) => String(p).replace(/\D/g, ""));
  const rawVariants = names.map((name, i) => ({
    id: ids[i] ?? "",
    name,
    price: prices[i] ? Number(prices[i]) : 0,
  }));

  const parsed = productSchema.safeParse({
    name: formData.get("name") ?? "",
    categoryId: formData.get("categoryId") || 0,
    description: formData.get("description") ?? "",
    isAvailable: formData.get("isAvailable") === "on",
    variants: rawVariants,
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [field, index, sub] = issue.path;
      if (field === "name") errors.name = "name";
      else if (field === "categoryId") errors.categoryId = "category";
      else if (field === "description") errors.description = "description";
      else if (field === "variants" && typeof index === "number") {
        errors.rows ??= {};
        errors.rows[index] ??= {};
        if (sub === "name") errors.rows[index].name = "sizeName";
        else if (sub === "price") errors.rows[index].price = "sizePrice";
      } else if (field === "variants") errors.sizes = "sizes";
    }
  }

  // Duplicate size names would break the (product_id, name) unique key.
  const seen = new Map<string, number>();
  rawVariants.forEach((v, i) => {
    const key = v.name.trim().toLowerCase();
    if (!key) return;
    if (seen.has(key)) {
      errors.rows ??= {};
      errors.rows[i] = { ...errors.rows[i], name: "sizeDuplicate" };
    } else seen.set(key, i);
  });

  const photo = formData.get("photo");
  const file = photo instanceof File && photo.size > 0 ? photo : null;
  let ext: string | null = null;
  let bytes: Buffer | null = null;
  if (file && !UPLOAD_TYPES[file.type]) errors.photo = "photoType";
  else if (file && file.size > MAX_UPLOAD_BYTES) errors.photo = "photoSize";
  else if (file) {
    // Trust the file signature, not the browser-reported type: the extension
    // comes from the sniffed bytes and must agree with the declared type.
    bytes = Buffer.from(await file.arrayBuffer());
    ext = sniffImageType(bytes);
    if (!ext || ext !== UPLOAD_TYPES[file.type]) errors.photo = "photoType";
  }

  const category = parsed.success
    ? await db.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } })
    : null;
  if (parsed.success && !category) errors.categoryId = "category";

  const existing = productId
    ? await db.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          variants: { select: { id: true, _count: { select: { orderItems: true } } } },
        },
      })
    : null;
  if (productId && !existing) return { status: "error", errors: { form: "notFound" } };

  // Sizes that appear in past orders cannot be deleted (order_items FK).
  const keptIds = new Set(ids.filter(Boolean));
  const removed = existing?.variants.filter((v) => !keptIds.has(v.id.toString())) ?? [];
  if (removed.some((v) => v._count.orderItems > 0)) errors.sizes = "sizeInUse";

  if (!parsed.success || Object.keys(errors).length > 0) return { status: "error", errors };
  const data = parsed.data;

  const slug =
    existing && existing.name === data.name ? existing.slug : await uniqueSlug(data.name, existing?.id ?? null);

  let imageUrl = existing?.imageUrl ?? null;
  let savedFile: string | null = null;
  if (bytes && ext) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const fileName = `${slug}-${Date.now()}.${ext}`;
    // Saved exactly as uploaded: no resizing, no re-encoding.
    await writeFile(path.join(UPLOAD_DIR, fileName), bytes);
    savedFile = `/uploads/${fileName}`;
    imageUrl = savedFile;
  }

  try {
    if (!existing) {
      await db.product.create({
        data: {
          categoryId: data.categoryId,
          name: data.name,
          slug,
          description: data.description || null,
          imageUrl,
          isAvailable: data.isAvailable,
          variants: { create: data.variants.map((v) => ({ name: v.name, price: v.price })) },
        },
      });
    } else {
      const ownIds = new Set(existing.variants.map((v) => v.id.toString()));
      const updates = data.variants.filter((v) => v.id && ownIds.has(v.id));
      const creates = data.variants.filter((v) => !v.id || !ownIds.has(v.id));
      await db.$transaction([
        db.product.update({
          where: { id: existing.id },
          data: {
            categoryId: data.categoryId,
            name: data.name,
            slug,
            description: data.description || null,
            imageUrl,
            isAvailable: data.isAvailable,
          },
        }),
        db.productVariant.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } }),
        // Two steps so swapping two size names never hits the unique key.
        ...updates.map((v) =>
          db.productVariant.update({ where: { id: BigInt(v.id) }, data: { name: `~${randomUUID().slice(0, 40)}` } }),
        ),
        ...updates.map((v) =>
          db.productVariant.update({ where: { id: BigInt(v.id) }, data: { name: v.name, price: v.price } }),
        ),
        ...creates.map((v) =>
          db.productVariant.create({ data: { productId: existing.id, name: v.name, price: v.price } }),
        ),
      ]);
      if (savedFile && existing.imageUrl !== savedFile) await removeUpload(existing.imageUrl);
    }
  } catch (error) {
    console.error("saveProduct failed", error);
    if (savedFile) await removeUpload(savedFile);
    return { status: "error", errors: { form: "generic" } };
  }

  // Layout-wide on purpose: products feed the menu, landing page and product pages.
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export type DeleteProductState = { status: "idle" | "in-use" | "failed" };

/** Hard delete, refused when any of the product's sizes appear in past orders. */
export async function deleteProduct(productId: string): Promise<DeleteProductState> {
  await requireAdmin();
  if (!idSchema.safeParse(productId).success) return { status: "failed" };
  const id = BigInt(productId);
  const inOrders = await db.orderItem.count({ where: { variant: { productId: id } } });
  if (inOrders > 0) return { status: "in-use" };

  const product = await db.product.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!product) return { status: "failed" };
  try {
    await db.product.delete({ where: { id } });
  } catch (error) {
    console.error("deleteProduct failed", error);
    return { status: "failed" };
  }
  await removeUpload(product.imageUrl);
  // Layout-wide on purpose: products feed the menu, landing page and product pages.
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

/** The alternative to deleting: hide the product from the menu. */
export async function hideProduct(productId: string): Promise<DeleteProductState> {
  await requireAdmin();
  if (!idSchema.safeParse(productId).success) return { status: "failed" };
  const { count } = await db.product.updateMany({ where: { id: BigInt(productId) }, data: { isAvailable: false } });
  if (count === 0) return { status: "failed" };
  // Layout-wide on purpose: products feed the menu, landing page and product pages.
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export type ProductSuggestion = {
  id: string;
  name: string;
  imageUrl: string | null;
  categorySlug: string;
  categoryName: string;
  fromPrice: number | null;
  variantCount: number;
};

/** Live results for the product search popover. */
export async function suggestProducts(query: string): Promise<ProductSuggestion[]> {
  await requireAdmin();
  const q = query.trim().slice(0, 100);
  if (!q) return [];
  const rows = await db.product.findMany({
    where: { name: { contains: q } },
    orderBy: { id: "asc" },
    take: 6,
    select: {
      id: true,
      name: true,
      imageUrl: true,
      category: { select: { slug: true, name: true } },
      variants: { select: { price: true }, orderBy: { price: "asc" } },
    },
  });
  return rows.map((p) => ({
    id: p.id.toString(),
    name: p.name,
    imageUrl: p.imageUrl,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    fromPrice: p.variants[0]?.price ?? null,
    variantCount: p.variants.length,
  }));
}
