import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

const linkClasses =
  "inline-flex items-center gap-1.5 rounded-sm px-3.5 py-2.5 text-sm leading-[21px] font-bold text-foreground inset-ring-[1.25px] inset-ring-border-subtle transition-colors hover:bg-card";

/** Previous / page x of y / next, below an admin table. Not in the pen file; only shown past one page. */
export function Pagination({
  page,
  totalPages,
  href,
  labels,
}: {
  page: number;
  totalPages: number;
  href: (page: number) => string;
  labels: { previous: string; next: string; page: string; nav: string };
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={labels.nav} className="flex w-full flex-wrap items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClasses} rel="prev">
          <ArrowLeft className="size-4" aria-hidden />
          {labels.previous}
        </Link>
      ) : (
        <span className={cn(linkClasses, "pointer-events-none opacity-40")} aria-hidden>
          <ArrowLeft className="size-4" aria-hidden />
          {labels.previous}
        </span>
      )}
      <p className="font-mono text-[13px] leading-5 font-semibold text-muted-foreground" aria-current="page">
        {labels.page}
      </p>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={linkClasses} rel="next">
          {labels.next}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(linkClasses, "pointer-events-none opacity-40")} aria-hidden>
          {labels.next}
          <ArrowRight className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
