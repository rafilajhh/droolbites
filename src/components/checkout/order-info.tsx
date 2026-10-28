import { Mail, MessageCircle, Store, Truck } from "lucide-react";
import { cn } from "@/lib/cn";

/** White list of label/value rows (Info Grid on the success and order pages). */
export function InfoGrid({ rows, className }: { rows: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("flex w-full flex-col rounded-m bg-white inset-ring-1 inset-ring-border-subtle", className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex w-full items-center justify-between gap-4 px-5 py-[18px] shadow-[inset_0_-1px_0_var(--border-subtle)] last:shadow-none sm:px-6"
        >
          <dt className="text-[15px] leading-[23px] text-muted-foreground">{row.label}</dt>
          <dd className="text-right text-[15px] leading-[23px] font-bold text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Mint card with the delivery address or the pickup store. */
export function FulfilmentCard({
  method,
  title,
  lines,
}: {
  method: "delivery" | "pickup";
  title: string;
  lines: string[];
}) {
  const Icon = method === "delivery" ? Truck : Store;
  return (
    <div className="flex w-full gap-4 rounded-m bg-mint p-6">
      <Icon className="size-6 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-base leading-6 font-bold text-foreground">{title}</p>
        {lines.map((line) => (
          <p key={line} className="text-[15px] leading-[23px] break-words text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/** One quiet line with the store's WhatsApp and email under the actions. */
export function StoreContact({
  label,
  phone,
  email,
  whatsappLabel,
  emailLabel,
}: {
  label: string;
  phone: string;
  email: string;
  whatsappLabel: string;
  emailLabel: string;
}) {
  const wa = `https://wa.me/${phone.replace(/\D/g, "")}`;
  return (
    // Below sm the label sits on its own line so the email never wraps alone.
    <p className="flex flex-col text-sm leading-[21px] text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
      <span>{label}</span>
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:underline">
          <MessageCircle className="size-4" aria-hidden />
          <span className="sr-only">{whatsappLabel} </span>
          {phone}
        </a>
        <a href={`mailto:${email}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:underline">
          <Mail className="size-4" aria-hidden />
          <span className="sr-only">{emailLabel} </span>
          {email}
        </a>
      </span>
    </p>
  );
}
