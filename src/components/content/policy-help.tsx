import { Mail, MessageCircle, Phone } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

type HelpCopy = {
  title: string;
  body: string;
  whatsapp: string;
  email: string;
  call: string;
};

/**
 * Closing "Still need help?" panel shared by the three policy pages: the copy on the
 * left and the three contact actions on the right at lg.
 */
export function PolicyHelp({ copy, email, phone }: { copy: HelpCopy; email: string; phone: string }) {
  return (
    <section aria-labelledby="policy-help" className="section-y w-full px-3 md:px-6">
      <div className="panel-y flex w-full flex-col gap-8 rounded-m bg-mint px-6 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-16">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-4">
          <h2 id="policy-help" className="type-section font-display text-balance font-bold text-foreground">
            {copy.title}
          </h2>
          <p className="max-w-[35em] text-pretty text-[17px] leading-[28px] text-muted-foreground">{copy.body}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-[260px] lg:shrink-0 lg:flex-col">
          <a
            href={`https://wa.me/${phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("primary")}
          >
            <MessageCircle className="size-[18px] shrink-0" aria-hidden />
            {copy.whatsapp}
          </a>
          <a href={`mailto:${email}`} className={buttonClasses("secondary")}>
            <Mail className="size-[18px] shrink-0" aria-hidden />
            {copy.email}
          </a>
          <a href={`tel:${phone.replace(/\s/g, "")}`} className={buttonClasses("secondary")}>
            <Phone className="size-[18px] shrink-0" aria-hidden />
            {copy.call}
          </a>
        </div>
      </div>
    </section>
  );
}
