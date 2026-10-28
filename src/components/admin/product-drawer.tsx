"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { saveProduct, type ProductErrorKey, type ProductFormState } from "@/app/actions/admin/products";
import { useModal } from "@/components/layout/shop-ui";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/form-field";
import { categoryName } from "@/content/products";
import { useLocale, useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { DeleteDialog } from "./delete-dialog";
import { isTrayCategory, MAX_UPLOAD_BYTES, UPLOAD_TYPES } from "./rules";
import { Toggle } from "./ui";

export type DrawerProduct = {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  isAvailable: boolean;
  imageUrl: string | null;
  hasOrders: boolean;
  variants: { id: string; name: string; price: number; inUse: boolean }[];
};

type Row = { key: string; id: string; name: string; price: string; inUse: boolean };

const cellClasses =
  "w-full rounded-sm bg-white px-3.5 py-[11px] text-[15px] leading-[23px] text-foreground placeholder:text-muted-foreground inset-ring-[1.25px] inset-ring-border-input outline-hidden transition-shadow focus-visible:inset-ring-2 focus-visible:inset-ring-primary aria-[invalid=true]:inset-ring-error";

let rowSeq = 0;
const newRow = (): Row => ({ key: `new-${++rowSeq}`, id: "", name: "", price: "", inUse: false });

/** pen: Add Drawer (AxKj6) and Edit Drawer (Z3eYvb), 560px from the right over the product list. */
export function ProductDrawer({
  product,
  categories,
  closeHref,
}: {
  product?: DrawerProduct;
  categories: { id: string; slug: string; name: string }[];
  closeHref: string;
}) {
  const all = useMessages(adminMessages);
  const t = all.product;
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(saveProduct, {
    status: "idle",
    errors: {},
  });

  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [available, setAvailable] = useState(product?.isAvailable ?? true);
  const [rows, setRows] = useState<Row[]>(() =>
    product?.variants.length
      ? product.variants.map((v) => ({ key: v.id, id: v.id, name: v.name, price: String(v.price), inUse: v.inUse }))
      : [newRow()],
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<ProductErrorKey | null>(null);
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Any edit (typing, toggles, photo, adding/removing sizes) makes closing ask first.
  const dirty = useRef(false);
  const markDirty = () => {
    dirty.current = true;
  };

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  const close = useCallback(() => {
    if (dirty.current && !window.confirm(t.discardChanges)) return;
    router.push(closeHref, { scroll: false });
  }, [router, closeHref, t.discardChanges]);
  // The delete dialog stacks on top while open; useModal pauses this one meanwhile.
  const panelRef = useModal(true, close);

  // After a failed save, move focus to the first highlighted field.
  useEffect(() => {
    if (state.status === "error") formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  const errors = state.errors;
  const err = (key: ProductErrorKey | undefined | null) => (key ? t.errors[key] : undefined);
  const slug = categories.find((c) => c.id === categoryId)?.slug;
  const image = preview ?? product?.imageUrl ?? null;

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (!file) return;
    if (!UPLOAD_TYPES[file.type]) setPhotoError("photoType");
    else if (file.size > MAX_UPLOAD_BYTES) setPhotoError("photoSize");
    if (!UPLOAD_TYPES[file.type] || file.size > MAX_UPLOAD_BYTES) {
      e.target.value = "";
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const photoMessage = err(photoError) ?? err(errors.photo);

  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden className="absolute inset-0 bg-ink/50" onClick={close} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col bg-background"
      >
        <form
          ref={formRef}
          onSubmit={onSubmit}
          onChange={markDirty}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          encType="multipart/form-data"
        >
          {product ? <input type="hidden" name="id" value={product.id} /> : null}

          <div className="flex w-full items-center justify-between gap-4 px-5 py-6 shadow-[inset_0_-1px_0_var(--border-subtle)] sm:px-7">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="font-mono text-xs leading-[18px] font-semibold tracking-[1px] text-primary">
                {product ? t.editEyebrow : t.newEyebrow}
              </p>
              <h2 id={`${id}-title`} className="truncate font-display text-[28px] leading-[31px] font-bold">
                {product ? product.name : t.newTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={t.close}
              className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-oat transition-colors hover:bg-card-accent"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="flex min-h-0 w-full flex-1 flex-col gap-5 overflow-y-auto px-5 py-6 sm:px-7">
            <div className="flex w-full items-center gap-4">
              <div
                className={cn(
                  "relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-oat",
                  !image && "inset-ring-[1.5px] inset-ring-border/40",
                )}
              >
                {image ? (
                  <Image src={image} alt="" fill sizes="96px" quality={100} unoptimized={!!preview} className="object-cover" />
                ) : (
                  <ImagePlus className="size-7 text-primary" aria-hidden />
                )}
              </div>
              <div className="flex flex-col items-start gap-1.5">
                <span id={`${id}-photo-label`} className="text-sm leading-[21px] font-bold">
                  {t.photo}
                </span>
                <input
                  id={`${id}-photo`}
                  type="file"
                  name="photo"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onPhoto}
                  aria-labelledby={`${id}-photo-label ${id}-photo-button`}
                  aria-invalid={photoMessage ? true : undefined}
                  className="peer sr-only"
                />
                <label
                  id={`${id}-photo-button`}
                  htmlFor={`${id}-photo`}
                  className="inline-flex cursor-pointer items-center justify-center rounded-sm px-3.5 py-2 font-display text-xs leading-[14px] font-semibold tracking-[0.5px] text-foreground inset-ring-[1.5px] inset-ring-border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-highlight hover:bg-card"
                >
                  {image ? t.replace : t.upload}
                </label>
                {photoMessage ? (
                  <p role="alert" className="text-[13px] leading-5 text-error">
                    {photoMessage}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 sm:flex-row">
              <Field label={t.name} htmlFor={`${id}-name`} error={err(errors.name)} className="flex-1">
                <TextInput
                  id={`${id}-name`}
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  placeholder={t.namePlaceholder}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? `${id}-name-error` : undefined}
                />
              </Field>
              <Field label={t.category} htmlFor={`${id}-category`} error={err(errors.categoryId)} className="flex-1">
                <Select
                  id={`${id}-category`}
                  name="categoryId"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  aria-invalid={errors.categoryId ? true : undefined}
                  aria-describedby={errors.categoryId ? `${id}-category-error` : undefined}
                  className={cn(!categoryId && "text-muted-foreground")}
                >
                  <option value="" disabled>
                    {t.categoryPlaceholder}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="text-foreground">
                      {categoryName(c.slug, c.name, locale)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label={t.description} htmlFor={`${id}-description`} error={err(errors.description)}>
              {/* One line like the pen's input, but it grows when the text wraps (narrow screens) so
                  nothing is edited out of sight. Enter is swallowed: the description is a single line. */}
              <TextArea
                id={`${id}-description`}
                name="description"
                rows={1}
                className="resize-none field-sizing-content"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                maxLength={255}
                placeholder={t.descriptionPlaceholder}
                aria-invalid={errors.description ? true : undefined}
                aria-describedby={errors.description ? `${id}-description-error` : undefined}
              />
            </Field>

            <fieldset aria-labelledby={`${id}-sizes`} className="flex w-full flex-col gap-2.5">
              <div className="flex w-full items-center justify-between gap-3">
                <span id={`${id}-sizes`} className="text-sm leading-[21px] font-bold">
                  {isTrayCategory(slug) ? t.traySizes : t.sizes}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    markDirty();
                    setRows((rs) => [...rs, newRow()]);
                  }}
                  className="relative rounded-[4px] text-sm leading-[21px] font-bold text-primary after:absolute after:-inset-x-2 after:-top-3.5 after:-bottom-[9px] after:content-[''] hover:underline"
                >
                  {t.addSize}
                </button>
              </div>
              {rows.map((row, i) => {
                const rowErr = errors.rows?.[i];
                const rowErrId = rowErr?.name || rowErr?.price ? `${id}-row-${i}-error` : undefined;
                return (
                  <div key={row.key} className="flex w-full flex-col gap-1">
                    <div className="flex w-full items-center gap-2.5">
                      <input type="hidden" name="variantId" value={row.id} />
                      <input
                        name="variantName"
                        value={row.name}
                        onChange={(e) => update(row.key, { name: e.target.value })}
                        maxLength={50}
                        placeholder={t.sizePlaceholder}
                        aria-label={t.sizeName(i + 1)}
                        aria-required="true"
                        aria-invalid={rowErr?.name ? true : undefined}
                        aria-describedby={rowErr?.name ? rowErrId : undefined}
                        className={cn(cellClasses, "min-w-0 flex-1")}
                      />
                      <input
                        name="variantPrice"
                        inputMode="numeric"
                        value={row.price ? formatRupiah(Number(row.price)) : ""}
                        onChange={(e) => update(row.key, { price: e.target.value.replace(/\D/g, "").slice(0, 9) })}
                        placeholder="Rp0"
                        aria-label={t.sizePrice(i + 1)}
                        aria-required="true"
                        aria-invalid={rowErr?.price ? true : undefined}
                        aria-describedby={rowErr?.price ? rowErrId : undefined}
                        className={cn(cellClasses, "w-[120px] shrink-0 sm:w-[160px]")}
                      />
                      {rows.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            markDirty();
                            setRows((rs) => rs.filter((r) => r.key !== row.key));
                          }}
                          disabled={row.inUse}
                          title={row.inUse ? t.errors.sizeInUse : undefined}
                          aria-label={t.removeSize(i + 1)}
                          className="relative shrink-0 rounded-[4px] text-muted-foreground after:absolute after:-inset-3 hover:text-error disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 className="size-[18px]" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    {rowErrId ? (
                      <p id={rowErrId} role="alert" className="text-[13px] leading-5 text-error">
                        {err(rowErr?.name) ?? err(rowErr?.price)}
                      </p>
                    ) : null}
                  </div>
                );
              })}
              {errors.sizes ? (
                <p role="alert" className="text-[13px] leading-5 text-error">
                  {err(errors.sizes)}
                </p>
              ) : null}
            </fieldset>

            <div className="flex w-full items-center gap-3 rounded-sm bg-mint p-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <label htmlFor={`${id}-available`} className="text-base leading-6 font-bold">
                  {t.available}
                </label>
                <p id={`${id}-available-sub`} className="text-[13px] leading-5 text-muted-foreground">
                  {t.availableSub}
                </p>
              </div>
              <Toggle
                id={`${id}-available`}
                name="isAvailable"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                aria-describedby={`${id}-available-sub`}
              />
            </div>

            {errors.form ? (
              <p role="alert" className="text-sm leading-[21px] text-error">
                {err(errors.form)}
              </p>
            ) : state.status === "error" ? (
              <p role="alert" className="sr-only">
                {t.errors.fix}
              </p>
            ) : null}
          </div>

          <div className="flex w-full gap-3 px-5 py-5 shadow-[inset_0_1px_0_var(--border-subtle)] sm:px-7">
            {product ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label={t.delete}
                className="flex size-[50px] shrink-0 items-center justify-center rounded-sm text-error inset-ring-[1.5px] inset-ring-error/40 transition-colors hover:bg-tint-salmon"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            ) : null}
            <Link
              href={closeHref}
              scroll={false}
              onClick={(e) => {
                if (dirty.current && !window.confirm(t.discardChanges)) e.preventDefault();
              }}
              className={buttonClasses("secondary", "min-w-0 flex-1 px-4")}
            >
              {t.cancel}
            </Link>
            <Button type="submit" disabled={pending} className="min-w-0 flex-1 px-4">
              {pending ? t.saving : product ? t.save : t.create}
            </Button>
          </div>
        </form>
      </div>

      {product ? (
        <DeleteDialog
          open={confirming}
          onClose={() => setConfirming(false)}
          product={{
            id: product.id,
            name: product.name,
            sizes: product.variants.length,
            tray: isTrayCategory(categories.find((c) => c.id === product.categoryId)?.slug),
            hasOrders: product.hasOrders,
            isAvailable: product.isAvailable,
          }}
        />
      ) : null}
    </div>
  );
}
