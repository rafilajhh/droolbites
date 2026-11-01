import type { Metadata } from "next";
import { House, Smartphone, Store, Sunrise } from "lucide-react";
import { Eyebrow } from "@/components/content/eyebrow";
import { Chip, Sticker } from "@/components/ui/badges";
import { ButtonLink } from "@/components/ui/button";
import { Cutout, Snapshot } from "@/components/ui/snapshot";
import { storyMessages } from "@/i18n/messages/pages/story";
import { getMessages } from "@/i18n/server";
import { getMenu } from "@/lib/catalog";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(storyMessages);
  return { title: t.metaTitle, description: t.metaDescription };
}

const px = "px-4 sm:px-8 lg:px-16";
const sectionTitle = "type-section font-display text-balance font-bold text-foreground";

/** One tint and icon per chapter of the timeline, oldest first. */
const chapters = [
  { icon: House, bg: "bg-tint-mustard" },
  { icon: Store, bg: "bg-tint-lavender" },
  { icon: Smartphone, bg: "bg-tint-salmon" },
  { icon: Sunrise, bg: "bg-card" },
];

/** pen: Our story (wyZ4j), extended with a timeline, a founders quote and a numbers band. */
export default async function OurStoryPage() {
  const [t, menu] = await Promise.all([getMessages(storyMessages), getMenu()]);
  const numbers = t.numbers(menu.reduce((sum, c) => sum + c.products.length, 0));

  return (
    <>
      {/* Hero: the opening of the story beside a collage of close-cropped product photos. */}
      <section
        className="flex w-full flex-col gap-8 px-4 pt-6 sm:px-8 lg:flex-row lg:items-center lg:gap-[72px] lg:px-16 lg:pt-12"
        aria-labelledby="story-title"
      >
        <div className="flex flex-1 flex-col gap-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1
            id="story-title"
            className="type-page font-display text-balance font-bold text-foreground"
          >
            {t.title}
          </h1>
          <p className="max-w-[600px] text-pretty text-[17px] leading-[1.53] text-muted-foreground lg:text-[19px] lg:leading-[29px]">
            {t.intro}
          </p>
        </div>
        <div className="relative mx-auto aspect-[560/600] w-full max-w-[560px] shrink-0 lg:mx-0 lg:w-[560px]">
          <Snapshot
            src="/images/products/double-chocolate.png"
            alt=""
            priority
            sizes="(min-width: 1024px) 325px, 58vw"
            className="absolute top-[7%] left-0 aspect-[4/5] w-[58%]"
            imageClassName="scale-[1.45]"
          />
          <Snapshot
            src="/images/products/matcha-tiramisu.png"
            alt=""
            sizes="(min-width: 1024px) 258px, 46vw"
            className="absolute top-0 right-0 aspect-square w-[46%]"
            imageClassName="scale-[1.2]"
          />
          <Snapshot
            src="/images/products/red-velvet.png"
            alt=""
            sizes="(min-width: 1024px) 280px, 50vw"
            className="absolute right-[4%] bottom-0 aspect-[5/4] w-[50%]"
            imageClassName="scale-[1.6] object-[50%_45%]"
          />
          <Sticker className="absolute bottom-[8%] left-[6%]">{t.since}</Sticker>
        </div>
      </section>

      {/* Timeline: four chapters, oldest first. The year is the step marker. */}
      <section className={cn("section-y flex w-full flex-col gap-8 lg:gap-12", px)} aria-labelledby="story-timeline">
        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-end lg:gap-16">
          <h2 id="story-timeline" className={cn(sectionTitle, "flex-1")}>
            {t.timelineTitle}
          </h2>
          <p className="text-pretty text-lg leading-[27px] text-muted-foreground lg:w-[400px] lg:shrink-0">
            {t.timelineSub}
          </p>
        </div>
        <ol className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6 lg:grid-cols-4">
          {t.timeline.map((chapter, i) => {
            const Icon = chapters[i].icon;
            return (
              <li key={chapter.year} className={cn("flex flex-col gap-4 rounded-m p-5 lg:gap-5 lg:p-8", chapters[i].bg)}>
                <div className="flex items-center justify-between gap-4">
                  <p className="font-display text-4xl leading-none lg:text-5xl font-bold tracking-[-1px] text-foreground">
                    {chapter.year}
                  </p>
                  <Icon className="size-7 shrink-0 text-foreground" aria-hidden />
                </div>
                <h3 className="font-display text-[24px] leading-[28px] font-bold text-balance text-foreground lg:text-[26px] lg:leading-[30px]">
                  {chapter.title}
                </h3>
                <p className="text-pretty text-base leading-6 text-foreground">{chapter.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Founders: the two first recipes, then the sisters in their own words. */}
      <section
        className={cn("flex w-full flex-col items-center gap-10 pb-12 lg:flex-row lg:gap-20 lg:pb-20", px)}
        aria-labelledby="story-founders"
      >
        <div className="grid w-full max-w-[600px] shrink-0 grid-cols-2 gap-5 sm:gap-8 lg:w-[560px]">
          <figure className="flex flex-col gap-4">
            <Snapshot
              src="/images/products/chocolate-chunk.png"
              alt=""
              sizes="(min-width: 1024px) 264px, 45vw"
              className="aspect-[4/5] w-full"
              imageClassName="scale-[1.25]"
            />
            <figcaption>
              <Chip>{t.firstCookie}</Chip>
            </figcaption>
          </figure>
          <figure className="flex flex-col gap-4 pt-12 lg:pt-20">
            <Snapshot
              src="/images/products/fudgy-brownies.png"
              alt=""
              sizes="(min-width: 1024px) 264px, 45vw"
              className="aspect-[4/5] w-full"
              imageClassName="scale-[1.15]"
            />
            <figcaption>
              <Chip>{t.firstBrownie}</Chip>
            </figcaption>
          </figure>
        </div>
        <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-8">
          <div className="flex flex-col gap-4">
            <h2 id="story-founders" className={sectionTitle}>
              {t.foundersTitle}
            </h2>
            <p className="text-pretty text-base leading-normal text-muted-foreground lg:text-lg lg:leading-[27px]">
              {t.foundersBody}
            </p>
          </div>
          <figure className="relative flex w-full flex-col gap-5 rounded-m bg-tint-lime p-6 lg:p-8">
            <Cutout
              name="chocolate-chunk"
              width={112}
              className="-right-6 -bottom-10 hidden lg:block"
            />
            <blockquote className="font-display text-[22px] leading-[29px] font-semibold text-pretty text-foreground lg:pr-16 lg:text-[26px] lg:leading-[34px]">
              <p>“{t.quote}”</p>
            </blockquote>
            <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-display text-lg leading-[22px] font-bold text-foreground">{t.quoteName}</span>
              <span className="font-mono text-[13px] leading-[17px] font-semibold text-primary">{t.quoteRole}</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Numbers: where the story stands today. */}
      <section
        className={cn(
          "panel-y flex w-full flex-col gap-8 bg-primary [--focus-ring:var(--white)] lg:flex-row lg:items-center lg:gap-16",
          px,
        )}
        aria-labelledby="story-numbers"
      >
        <div className="flex flex-col gap-3 lg:w-[360px] lg:shrink-0">
          <h2
            id="story-numbers"
            className="type-section font-display text-balance font-bold text-foreground-inverse"
          >
            {t.numbersTitle}
          </h2>
          <p className="text-pretty text-base leading-6 text-mint lg:text-lg lg:leading-[27px]">{t.numbersSub}</p>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {numbers.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse justify-end gap-2">
              <dt className="text-pretty text-[15px] leading-[23px] text-mint">{stat.label}</dt>
              <dd className="flex items-center gap-2 font-display text-[52px] leading-none font-bold tracking-[-1px] text-foreground-inverse lg:text-[64px]">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Visit CTA: the story ends at the counter. */}
      <section className="section-y w-full px-3 md:px-6" aria-labelledby="story-visit">
        <div className="flex w-full flex-col gap-10 rounded-m bg-mint px-6 panel-y sm:px-10 lg:flex-row lg:items-center lg:gap-16 lg:px-16">
          <div className="flex flex-1 flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h2
                id="story-visit"
                className="type-section font-display text-balance font-bold text-foreground"
              >
                {t.visitTitle}
              </h2>
              <p className="max-w-[600px] text-pretty text-lg leading-[27px] text-muted-foreground">{t.visitBody}</p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <ButtonLink href="/location">{t.findStore}</ButtonLink>
              <ButtonLink href="/menu" variant="secondary">
                {t.viewMenu}
              </ButtonLink>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[320px] shrink-0 lg:mx-0 lg:w-[320px]">
            <Snapshot
              src="/images/products/white-chocolate-almond.png"
              alt=""
              sizes="(min-width: 1024px) 320px, 80vw"
              className="aspect-[4/3] w-full"
              imageClassName="scale-[1.35]"
            />
          </div>
        </div>
      </section>
    </>
  );
}
