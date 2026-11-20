import { Mail, MessageCircle, Phone } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type HelpCopy = {
  title: string;
  body: string;
  whatsapp: string;
  email: string;
  call: string;
};

/** WhatsApp, email and call: the three ways to reach the shop, primary first. */
function ContactActions({ copy, email, phone, className }: { copy: HelpCopy; email: string; phone: string; className?: string }) {
  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
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
  );
}

/**
 * Closing "Still need help?" panel shared by the three policy pages: the copy on the left and the three
 * contact actions on the right at lg. From xl it moves up beside the text as a sticky rail instead
 * (`PolicyHelpRail`), so the reading column isn't left with empty paper on its right.
 */
export function PolicyHelp({ copy, email, phone }: { copy: HelpCopy; email: string; phone: string }) {
  return (
    <section aria-labelledby="policy-help" className="section-y w-full px-3 md:px-6 xl:hidden">
      <div className="panel-y flex w-full flex-col gap-8 rounded-m bg-mint px-6 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-16">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-4">
          <h2 id="policy-help" className="type-section font-display text-balance font-bold text-foreground">
            {copy.title}
          </h2>
          <p className="max-w-[35em] text-pretty text-[17px] leading-[28px] text-muted-foreground">{copy.body}</p>
        </div>
        <ContactActions copy={copy} email={email} phone={phone} className="sm:flex-row sm:flex-wrap lg:w-[260px] lg:shrink-0 lg:flex-col" />
      </div>
    </section>
  );
}

/** The same help, from xl: a mint side note that stays in view beside the policy text. */
export function PolicyHelpRail({ copy, email, phone }: { copy: HelpCopy; email: string; phone: string }) {
  return (
    <aside
      aria-labelledby="policy-help-rail"
      className="hidden w-[280px] shrink-0 flex-col gap-5 self-start rounded-m bg-mint p-6 xl:sticky xl:top-[88px] xl:flex"
    >
      <div className="flex flex-col gap-2">
        <h2 id="policy-help-rail" className="font-display text-[22px] leading-[26px] font-bold text-balance text-foreground">
          {copy.title}
        </h2>
        <p className="text-pretty text-[15px] leading-[23px] text-muted-foreground">{copy.body}</p>
      </div>
      <ContactActions copy={copy} email={email} phone={phone} />
    </aside>
  );
}
