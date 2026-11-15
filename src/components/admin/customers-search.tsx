"use client";

import { useRouter } from "next/navigation";
import { SearchField } from "./search-field";

/**
 * Toolbar search for Admin / Customers: filters the list as you type (?q=, keeping ?tab=;
 * a new query starts again at page 1), like the orders and products toolbars.
 */
export function CustomersSearch({
  q,
  tab,
  label,
  placeholder,
}: {
  q: string;
  tab: string | null;
  label: string;
  placeholder: string;
}) {
  const router = useRouter();
  return (
    <SearchField
      label={label}
      placeholder={placeholder}
      query={q}
      onSearch={(next) => {
        const search = new URLSearchParams();
        if (tab) search.set("tab", tab);
        if (next) search.set("q", next);
        const qs = search.toString();
        router.replace(qs ? `/admin/customers?${qs}` : "/admin/customers", { scroll: false });
      }}
    />
  );
}
