"use client";

import { useRef, useState, useTransition } from "react";
import { createCategory, type CategoryErrorKey } from "@/app/actions/admin/categories";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { adminCategoriesMessages } from "@/i18n/messages/admin-categories";
import { Card } from "./ui";

/** The "Add a category" card above the list. */
export function CategoriesAddForm() {
  const t = useMessages(adminCategoriesMessages);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<CategoryErrorKey | null>(null);
  const [added, setAdded] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdded("");
    startTransition(async () => {
      const result = await createCategory(name);
      if (result.status === "saved") {
        setError(null);
        setName("");
        setAdded(result.name);
      } else {
        setError(result.error);
        formRef.current?.querySelector<HTMLInputElement>("#category-new-name")?.focus();
      }
    });
  };

  return (
    <Card className="flex w-full flex-col gap-4 p-6">
      <h2 className="font-display text-[22px] leading-[33px] font-bold">{t.add.title}</h2>
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-4 sm:flex-row sm:items-start">
        <Field
          label={t.add.label}
          htmlFor="category-new-name"
          helper={t.add.help}
          error={error ? t.errors[error] : undefined}
          className="min-w-0 flex-1"
        >
          <TextInput
            id="category-new-name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder={t.add.placeholder}
            maxLength={50}
            autoComplete="off"
            required
            aria-invalid={error ? true : undefined}
          />
        </Field>
        {/* Lines the button up with the 52px input under the 18px label + 8px gap. */}
        <Button type="submit" disabled={pending} className="shrink-0 sm:mt-[26px] sm:py-[17px]">
          {pending ? t.add.submitting : t.add.submit}
        </Button>
      </form>
      <p role="status" className={added ? "text-sm leading-[21px] font-semibold text-success" : "sr-only"}>
        {added ? t.add.added(added) : ""}
      </p>
    </Card>
  );
}
