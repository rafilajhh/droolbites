import Image from "next/image";
import { Clock, Mail, MessageCircle } from "lucide-react";
import { Sticker } from "@/components/ui/badges";
import { ArrowLink, buttonClasses } from "@/components/ui/button";
import { photoFrame } from "@/components/ui/snapshot";
import { cn } from "@/lib/cn";

type HelpCopy = {
  title: string;
  body: string;
  whatsapp: string;
  email: string;
  call: string;
  hours: (hours: string) => string;
  more: string;
};

/**
 * Closing "Still need help?" panel shared by the three policy pages: contact actions,
 * a framed tiramisu photo with today's hours, and links to the other help pages.
 */
export function PolicyHelp({
  copy,
  email,
  phone,
  hours,
  links,
}: {
  copy: HelpCopy;
  email: string;
  phone: string;
  hours: string;
  links: { href: string; label: string }[];
}) {
  return (
    <section aria-labelledby="policy-help" className="w-full px-3 pb-16 md:px-6 lg:pb-28">
      <div className="flex w-full flex-col gap-10 rounded-m bg-mint px-6 py-10 sm:p-10 lg:gap-12 lg:p-16">
        <div className="flex w-full flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-5">
            <h2
              id="policy-help"
              className="font-display text-balance text-[34px] leading-[1.03] font-bold tracking-[-1px] text-foreground lg:text-[48px] lg:leading-[49px]"
            >
              {copy.title}
            </h2>
            <p className="max-w-[35em] text-pretty text-[17px] leading-[28px] text-muted-foreground">{copy.body}</p>
            <div className="flex w-full flex-col gap-3 pt-1 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
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
            </div>
            <p className="text-[15px] leading-[23px] text-muted-foreground">
              {copy.call}{" "}
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="relative inline-block font-semibold whitespace-nowrap text-foreground underline underline-offset-4 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] hover:no-underline"
              >
                {phone}
              </a>
            </p>
          </div>
          <div className="relative mb-4 aspect-[4/3] w-full max-w-[420px] shrink-0 lg:mb-0 lg:w-[420px]">
            {/* Product photo on an oat plate, like the home brownies band. */}
            <div className={cn(photoFrame, "absolute top-[6%] left-[4%] h-[88%] w-[92%] bg-oat")}>
              <Image
                src="/images/products/matcha-tiramisu.png"
                alt=""
                fill
                quality={100}
                sizes="(min-width: 1024px) 390px, 85vw"
                className="object-cover"
              />
            </div>
            <Sticker className="absolute -bottom-4 left-4 inline-flex items-center gap-2 rotate-[-5deg]">
              <Clock className="size-4 shrink-0" aria-hidden />
              {copy.hours(hours)}
            </Sticker>
          </div>
        </div>
        <nav
          aria-labelledby="policy-help-more"
          className="flex w-full flex-col gap-5 pt-8 shadow-[inset_0_1px_0_var(--border-divider)] sm:flex-row sm:items-center sm:gap-10"
        >
          <p id="policy-help-more" className="sr-only">
            {copy.more}
          </p>
          <ul className="flex flex-wrap gap-x-8 gap-y-6">
            {links.map((link) => (
              <li key={link.href}>
                <ArrowLink href={link.href}>{link.label}</ArrowLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
