import type { Metadata } from "next";
import Image from "next/image";
import { Mail, Paperclip, User } from "lucide-react";
import { Eyebrow } from "@/components/content/eyebrow";
import { buttonClasses } from "@/components/ui/button";
import { CAREERS_EMAIL, careersMessages } from "@/i18n/messages/pages/careers";
import { getMessages } from "@/i18n/server";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(careersMessages);
  return { title: t.metaTitle, description: t.metaDescription };
}

const cards = [
  { icon: Mail, bg: "bg-tint-mustard" },
  { icon: User, bg: "bg-tint-lavender" },
  { icon: Paperclip, bg: "bg-mint" },
];

/** pen: Join our team (ScPex). No form in the frame: applications go by email. */
export default async function CareersPage() {
  const t = await getMessages(careersMessages);
  const mailto = `mailto:${CAREERS_EMAIL}?subject=${encodeURIComponent(t.mailSubject)}`;

  return (
    <>
      <section className="flex w-full flex-col-reverse gap-10 px-4 pt-6 pb-16 sm:px-8 lg:flex-row lg:items-center lg:gap-[72px] lg:px-16 lg:pt-12 lg:pb-24">
        <div className="relative aspect-[15/14] w-full shrink-0 overflow-hidden rounded-m lg:aspect-auto lg:h-[560px] lg:w-[600px]">
          <Image
            src="/images/site/story-bakers.png"
            alt={t.imageAlt}
            fill
            priority
            quality={100}
            sizes="(min-width: 1024px) 600px, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-1 flex-col items-start gap-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="font-display text-balance text-[48px] leading-[1.02] font-bold tracking-[-1px] text-foreground sm:text-[64px] lg:text-[88px] lg:leading-[90px] lg:tracking-[-2px]">
            {t.title}
          </h1>
          <p className="text-[17px] leading-[1.53] text-muted-foreground lg:text-[19px] lg:leading-[29px]">{t.body}</p>
          <a href={mailto} className={buttonClasses("primary")}>
            {t.cta}
          </a>
        </div>
      </section>

      <section className="flex w-full flex-col gap-8 px-4 pb-16 sm:px-8 lg:gap-10 lg:px-16 lg:pb-28">
        <h2 className="font-display text-[34px] leading-[1.03] font-bold tracking-[-1px] text-foreground lg:text-[44px] lg:leading-[45px]">
          {t.howTitle}
        </h2>
        <ol className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {t.steps.map((step, i) => {
            const Icon = cards[i].icon;
            return (
              <li key={step.title} className={cn("flex flex-col gap-5 rounded-m p-8 lg:min-h-[254px]", cards[i].bg)}>
                <div className="flex items-center justify-between">
                  <span className="font-display text-5xl leading-none font-bold text-foreground" aria-hidden>
                    {i + 1}
                  </span>
                  <Icon className="size-7 text-foreground" aria-hidden />
                </div>
                <h3 className="font-display text-[26px] leading-[30px] font-bold text-foreground">{step.title}</h3>
                <p className="text-base leading-6 text-foreground">
                  {i === 0 ? (
                    <WriteToUs text={step.body(CAREERS_EMAIL)} mailto={mailto} />
                  ) : (
                    step.body(CAREERS_EMAIL)
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}

/** Turns the careers address inside the first step into a mailto link. */
function WriteToUs({ text, mailto }: { text: string; mailto: string }) {
  const [before, after] = text.split(CAREERS_EMAIL);
  return (
    <>
      {before}
      <a href={mailto} className="underline underline-offset-2">
        {CAREERS_EMAIL}
      </a>
      {after}
    </>
  );
}
