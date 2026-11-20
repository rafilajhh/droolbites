import type { Metadata } from "next";
import Image from "next/image";
import { Bike, ChefHat, Mail, Store } from "lucide-react";
import { Eyebrow } from "@/components/content/eyebrow";
import { Chip, Sticker } from "@/components/ui/badges";
import { buttonClasses } from "@/components/ui/button";
import { Cutout, Snapshot, photoFrame } from "@/components/ui/snapshot";
import { CAREERS_EMAIL, careersMessages } from "@/i18n/messages/pages/careers";
import { getMessages } from "@/i18n/server";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(careersMessages);
  return { title: t.metaTitle, description: t.metaDescription, alternates: { canonical: "/careers" } };
}

const px = "px-4 sm:px-8 lg:px-16";
const sectionTitle = "type-section font-display text-balance font-bold text-foreground";

const roleStyle = [
  { icon: ChefHat, fill: "bg-accent-mustard" },
  { icon: Store, fill: "bg-accent-teal" },
  { icon: Bike, fill: "bg-accent-lavender" },
];

const perkDots = ["bg-accent-mustard", "bg-accent-teal", "bg-accent-lavender", "bg-accent-salmon"];

/** pen: Join our team (ScPex). No form in the frame: applications go by email. */
export default async function CareersPage() {
  const t = await getMessages(careersMessages);
  const mailto = `mailto:${CAREERS_EMAIL}?subject=${encodeURIComponent(t.mailSubject)}`;

  return (
    <>
      <section className="flex w-full flex-col-reverse gap-8 px-4 pt-6 sm:px-8 lg:flex-row lg:items-center lg:gap-[72px] lg:px-16 lg:pt-12">
        <div className={cn(photoFrame, "aspect-[15/14] w-full shrink-0 lg:aspect-auto lg:h-[440px] lg:w-[480px] xl:h-[560px] xl:w-[600px]")}>
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
          <h1 className="type-page font-display text-balance font-bold text-foreground">
            {t.title}
          </h1>
          <p className="text-[17px] leading-[1.53] text-muted-foreground lg:text-[19px] lg:leading-[29px]">{t.body}</p>
          <a href={mailto} className={buttonClasses("primary")}>
            {t.cta}
          </a>
        </div>
      </section>

      {/* Roles we hire for: the usual shifts, not live vacancies. */}
      <section className={cn("section-y flex w-full flex-col gap-8 lg:gap-10", px)} aria-labelledby="careers-roles">
        <div className="flex w-full flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-end lg:gap-6">
          <h2 id="careers-roles" className={cn(sectionTitle, "lg:col-span-2")}>
            {t.rolesTitle}
          </h2>
          <p className="text-pretty text-base leading-normal text-muted-foreground lg:text-lg lg:leading-[27px]">
            {t.rolesSub}
          </p>
        </div>
        <ul className="grid w-full grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
          {t.roles.map((role, i) => {
            const Icon = roleStyle[i].icon;
            return (
              <li key={role.title} className="relative flex flex-col gap-4 rounded-m bg-card p-5 md:row-span-4 md:grid md:grid-rows-subgrid md:gap-5 md:p-6 lg:p-8">
                {i === 1 ? (
                  <Sticker size="sm" className="absolute -top-3 right-5 lg:right-7">
                    {t.rolesSticker}
                  </Sticker>
                ) : null}
                <span
                  className={cn("flex size-14 items-center justify-center rounded-pill", roleStyle[i].fill)}
                  aria-hidden
                >
                  <Icon className="size-7 text-ink" />
                </span>
                <div className="flex flex-col items-start gap-3">
                  <h3 className="font-display text-[24px] leading-[28px] font-bold text-foreground lg:text-[24px] lg:leading-[28px]">
                    {role.title}
                  </h3>
                  <Chip className="bg-background">{role.type}</Chip>
                </div>
                <p className="text-pretty text-base leading-normal text-muted-foreground">{role.body}</p>
                <dl className="flex flex-col gap-3 pt-5 shadow-[inset_0_1px_0_var(--border-divider)]">
                  <div className="flex flex-col gap-1">
                    <dt className="font-mono text-[12px] leading-4 font-semibold text-primary">{t.shiftLabel}</dt>
                    <dd className="text-[15px] leading-[23px] font-semibold text-foreground tabular-nums">
                      {role.shift} WIB
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="font-mono text-[12px] leading-4 font-semibold text-primary">{t.fitLabel}</dt>
                    <dd className="text-pretty text-[15px] leading-[23px] text-foreground">{role.fit}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
        <p className="max-w-[640px] text-pretty text-[15px] leading-[23px] text-muted-foreground">{t.rolesNote}</p>
      </section>

      {/* Perks: a moss panel in the page gutters, like the numbers band on Our story. */}
      <section className="w-full px-3 md:px-6" aria-labelledby="careers-perks">
        <div className="panel-y flex w-full flex-col gap-8 rounded-m bg-primary px-6 [--focus-ring:var(--white)] sm:px-10 lg:flex-row lg:gap-16 lg:px-16">
          <div className="flex flex-col gap-3 lg:w-[360px] lg:shrink-0">
            <h2
              id="careers-perks"
              className="type-section font-display text-balance font-bold text-foreground-inverse"
            >
              {t.perksTitle}
            </h2>
            <p className="text-pretty text-base leading-6 text-mint lg:text-lg lg:leading-[27px]">{t.perksSub}</p>
          </div>
          <ul className="grid flex-1 grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
            {t.perks.map((perk, i) => (
              <li key={perk.title} className="flex flex-col gap-3">
                <span className={cn("size-4 rounded-full", perkDots[i])} aria-hidden />
                <h3 className="font-display text-[24px] leading-[28px] font-bold text-foreground-inverse">
                  {perk.title}
                </h3>
                <p className="text-base leading-6 text-mint">{perk.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The team: a snapshot collage and a staff quote. */}
      <section
        className={cn("section-y flex w-full flex-col items-center gap-10 lg:flex-row lg:gap-20", px)}
        aria-labelledby="careers-team"
      >
        <div className="relative aspect-[600/540] w-full max-w-[600px] shrink-0 lg:w-[600px]">
          <Snapshot
            src="/images/site/party-spread.png"
            alt=""
            sizes="(min-width: 1024px) 264px, 44vw"
            className="absolute top-[8%] left-0 aspect-[2/3] w-[44%]"
          />
          <Snapshot
            src="/images/site/store-front.png"
            alt=""
            sizes="(min-width: 1024px) 324px, 54vw"
            className="absolute top-0 right-0 aspect-[1312/1199] w-[54%]"
          />
          <Snapshot
            src="/images/site/gift-box.png"
            alt=""
            sizes="(min-width: 1024px) 228px, 38vw"
            className="absolute right-[10%] bottom-0 aspect-[4/5] w-[38%]"
            imageClassName="object-[50%_40%]"
          />
          <Cutout
            name="red-velvet"
            width={112}
            className="bottom-[2%] left-[30%] hidden lg:block"
          />
        </div>
        <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-8">
          <div className="flex flex-col gap-4">
            <h2 id="careers-team" className={sectionTitle}>
              {t.teamTitle}
            </h2>
            <p className="text-pretty text-base leading-normal text-muted-foreground lg:text-lg lg:leading-[27px]">
              {t.teamBody}
            </p>
          </div>
          <figure className="flex w-full flex-col gap-5 rounded-m bg-tint-lime p-6 lg:p-8">
            <blockquote className="font-display text-[22px] leading-[29px] font-semibold text-pretty text-foreground lg:text-[26px] lg:leading-[34px]">
              <p>“{t.quote}”</p>
            </blockquote>
            <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-display text-lg leading-[22px] font-bold text-foreground">{t.quoteName}</span>
              <span className="font-mono text-[13px] leading-[17px] font-semibold text-primary">{t.quoteRole}</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Closing panel: the page ends on the action. How to apply sits beside it as three short steps,
          so the address and the button each appear once here (the hero has the only other button). */}
      <section className="w-full px-3 pb-12 md:px-6 lg:pb-20" aria-labelledby="careers-cta">
        <div className="panel-y grid w-full grid-cols-1 gap-10 rounded-m bg-tint-salmon px-6 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16 lg:px-16">
          <div className="flex flex-col items-start gap-6">
            <h2 id="careers-cta" className={sectionTitle}>
              {t.ctaTitle}
            </h2>
            <p className="max-w-[480px] text-pretty text-lg leading-[27px] text-muted-foreground">{t.ctaBody}</p>
            <a href={mailto} className={buttonClasses("primary", "max-sm:w-full")}>
              <Mail className="size-[18px] shrink-0" aria-hidden />
              {t.cta}
            </a>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-[22px] leading-[28px] font-bold text-foreground">{t.howTitle}</h3>
            <ol className="flex flex-col">
              {t.steps.map((step, i) => (
                <li
                  key={step.title}
                  className="flex gap-4 py-5 shadow-[inset_0_-1px_0_var(--border-divider)] last:pb-0 last:shadow-none"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-background font-display text-[15px] leading-none font-bold text-foreground"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-display text-lg leading-6 font-bold text-foreground">{step.title}</p>
                    <p className="text-pretty text-base leading-6 text-foreground">
                      {i === 0 ? <WriteToUs text={step.body(CAREERS_EMAIL)} mailto={mailto} /> : step.body(CAREERS_EMAIL)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
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
      <a href={mailto} className="font-semibold break-all underline underline-offset-2 hover:no-underline">
        {CAREERS_EMAIL}
      </a>
      {after}
    </>
  );
}
