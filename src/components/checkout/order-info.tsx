import { Mail, MessageCircle } from "lucide-react";

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
