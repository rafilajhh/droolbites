"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCategory, renameCategory, type CategoryErrorKey } from "@/app/actions/admin/categories";
import { inputClasses } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { adminCategoriesMessages } from "@/i18n/messages/admin-categories";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "./confirm-dialog";
import { Card, CellLabel, mobileCardRowClasses, smallButtonClasses, thClasses } from "./ui";

export type CategoryRow = { id: string; name: string; slug: string; visible: number; hidden: number };

type Messages = (typeof adminCategoriesMessages)["en"];

/** Stretches the small 30px buttons to a 44px tap target without changing their look (as in the products list). */
const hitArea = "relative after:absolute after:-inset-x-1 after:-inset-y-2 after:content-['']";

/** Every category with its product counts, inline rename and a guarded delete. */
export function CategoriesTable({ rows }: { rows: CategoryRow[] }) {
  const t = useMessages(adminCategoriesMessages);
  // One live region for rename and delete results (the add form has its own).
  const [announcement, setAnnouncement] = useState("");
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

  return (
    <Card className="w-full p-2 max-md:bg-transparent max-md:p-0 max-md:inset-ring-0">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <div className="relative w-full overflow-x-auto">
        <table aria-label={t.title} className="w-full border-separate border-spacing-0 max-md:block md:min-w-[640px]">
          <thead className="max-md:hidden">
            <tr>
              <th scope="col" className={cn(thClasses, "rounded-l-lg bg-background py-3 pl-4")}>
                {t.col.category}
              </th>
              <th scope="col" className={cn(thClasses, "w-[220px] bg-background py-3")}>
                {t.col.products}
              </th>
              <th scope="col" className={cn(thClasses, "w-[220px] rounded-r-lg bg-background py-3 pr-4")}>
                <span className="sr-only">{t.col.action}</span>
              </th>
            </tr>
          </thead>
          {/* Below md each row is a stacked card like the products list; cells carry sr-only labels. */}
          <tbody className="max-md:flex max-md:flex-col max-md:gap-2 md:[&_tr:not(:last-child)_td]:shadow-[inset_0_-1px_0_var(--border-subtle)] md:[&_tr:not(:last-child)_th]:shadow-[inset_0_-1px_0_var(--border-subtle)]">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="block px-4 py-8 text-center text-[15px] leading-[23px] text-muted-foreground md:table-cell"
                >
                  {t.empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <CategoryTableRow
                  key={row.id}
                  row={row}
                  t={t}
                  onAnnounce={setAnnouncement}
                  onDelete={() => setDeleting(row)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {deleting ? (
        <DeleteCategoryDialog
          key={deleting.id}
          onClose={() => setDeleting(null)}
          row={deleting}
          t={t}
          onDeleted={() => {
            setAnnouncement(t.deleted(deleting.name));
            setDeleting(null);
          }}
        />
      ) : null}
    </Card>
  );
}

function CategoryTableRow({
  row,
  t,
  onAnnounce,
  onDelete,
}: {
  row: CategoryRow;
  t: Messages;
  onAnnounce: (message: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [error, setError] = useState<CategoryErrorKey | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const inputId = `category-${row.id}-name`;
  const total = row.visible + row.hidden;

  // Focus the field when rename opens and hand focus back to RENAME when it closes.
  useEffect(() => {
    if (editing) inputRef.current?.select();
    else if (wasEditing.current) renameRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const startEditing = () => {
    setName(row.name);
    setError(null);
    setEditing(true);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await renameCategory(row.id, name);
      if (result.status === "saved") {
        setEditing(false);
        onAnnounce(t.renamed(result.name));
      } else {
        setError(result.error);
        inputRef.current?.focus();
      }
    });
  };

  return (
    <tr className={mobileCardRowClasses}>
      <th
        scope="row"
        className="py-3 pr-4 pl-4 text-left align-top font-normal max-md:order-1 max-md:basis-full max-md:p-0 md:align-middle"
      >
        {editing ? (
          <form onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-2">
            <label htmlFor={inputId} className="sr-only">
              {t.newName(row.name)}
            </label>
            <div className="flex w-full flex-wrap items-stretch gap-2">
              <input
                ref={inputRef}
                id={inputId}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditing(false);
                }}
                maxLength={50}
                autoComplete="off"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : `${inputId}-help`}
                className={cn(inputClasses, "min-w-0 flex-1 py-2.5 text-[15px] max-sm:basis-full sm:max-w-[320px]")}
              />
              <button type="submit" disabled={pending} className={cn(smallButtonClasses, "disabled:opacity-50")}>
                {pending ? t.saving : t.save}
              </button>
              <button type="button" onClick={() => setEditing(false)} className={smallButtonClasses}>
                {t.cancel}
              </button>
            </div>
            {error ? (
              <p id={`${inputId}-error`} role="alert" className="text-[13px] leading-5 text-error">
                {t.errors[error]}
              </p>
            ) : (
              <p id={`${inputId}-help`} className="text-[13px] leading-5 text-muted-foreground">
                {t.renameHelp}
              </p>
            )}
          </form>
        ) : (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] leading-[23px] font-bold break-words">{row.name}</span>
            <span className="truncate font-mono text-xs leading-[18px] text-muted-foreground">
              /menu?category={row.slug}
            </span>
          </span>
        )}
      </th>
      <td className="py-3 text-[15px] leading-[23px] font-medium max-md:order-2 max-md:min-w-0 max-md:grow max-md:p-0 max-md:text-sm max-md:leading-[21px]">
        <CellLabel>{t.col.products}</CellLabel>
        {total === 0 ? (
          <span className="text-muted-foreground">{t.noProducts}</span>
        ) : (
          <>
            {row.visible > 0 ? t.onMenu(row.visible) : t.offMenu}
            {row.hidden > 0 ? <span className="text-muted-foreground"> · {t.hidden(row.hidden)}</span> : null}
          </>
        )}
      </td>
      <td className="py-3 pr-4 text-right max-md:order-3 max-md:p-0">
        <span className="inline-flex gap-2">
          {editing ? null : (
            <button
              ref={renameRef}
              type="button"
              onClick={startEditing}
              aria-label={t.renameLabel(row.name)}
              className={cn(smallButtonClasses, hitArea)}
            >
              {t.rename}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label={t.deleteLabel(row.name)}
            aria-haspopup="dialog"
            className={cn(
              smallButtonClasses,
              hitArea,
              // Same crimson as the drawer's delete button; muted while products still block it.
              total === 0 ? "text-error inset-ring-error/40 hover:bg-tint-salmon" : "text-muted-foreground",
            )}
          >
            {t.delete}
          </button>
        </span>
      </td>
    </tr>
  );
}

/**
 * The Delete Dialog look (pen IBiDA). A category that still has products
 * can't be deleted (products keep a foreign key), so the dialog explains why
 * and links to its products instead.
 */
function DeleteCategoryDialog({
  onClose,
  row,
  t,
  onDeleted,
}: {
  onClose: () => void;
  row: CategoryRow;
  t: Messages;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lockedByServer, setLockedByServer] = useState(false);
  const [failed, setFailed] = useState(false);
  const total = row.visible + row.hidden;
  const locked = total > 0 || lockedByServer;
  const r = t.remove;

  const remove = () =>
    startTransition(async () => {
      setFailed(false);
      const result = await deleteCategory(row.id);
      if (result.status === "deleted") onDeleted();
      else if (result.status === "in-use") setLockedByServer(true);
      else setFailed(true);
    });

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      icon={Trash2}
      title={locked ? r.lockedTitle(row.name) : r.title(row.name)}
      body={
        locked ? (
          <>
            <p>{r.lockedBody(total > 0 ? r.products(total) : r.someProducts)}</p>
            <p>{r.lockedHint}</p>
          </>
        ) : (
          r.body
        )
      }
      error={failed ? r.failed : undefined}
      cancelLabel={locked ? r.close : r.cancel}
      confirmLabel={locked ? r.viewProducts : pending ? r.deleting : r.confirm}
      onConfirm={locked ? () => router.push(`/admin/products?category=${row.slug}`) : remove}
      pending={pending}
      danger={!locked}
    />
  );
}
