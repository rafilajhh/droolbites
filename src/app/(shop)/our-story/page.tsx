import type { Metadata } from "next";
import Image from "next/image";
import { Eyebrow } from "@/components/content/eyebrow";
import { ArrowLink, ButtonLink } from "@/components/ui/button";
import { Snapshot } from "@/components/ui/snapshot";
import { storyMessages } from "@/i18n/messages/pages/story";
import { getMessages } from "@/i18n/server";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(storyMessages);
  return { title: t.metaTitle, description: t.metaDescription };
}

const dots = ["bg-accent-mustard", "bg-accent-teal", "bg-accent-lavender"];

/** pen: Our story (wyZ4j). */
export default async function OurStoryPage() {
  const t = await getMessages(storyMessages);
  const tiles = [
    { ...t.tiles.cookies, href: "/menu?category=soft-cookies", image: "chocolate-chunk", bg: "bg-tint-mustard" },
    { ...t.tiles.brownies, href: "/menu/fudgy-brownies", image: "fudgy-brownies", bg: "bg-tint-lavender" },
    { ...t.tiles.tiramisu, href: "/menu?category=tiramisu", image: "classic-coffee-tiramisu", bg: "bg-tint-salmon" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="flex w-full flex-col gap-10 px-4 pt-6 pb-16 sm:px-8 lg:flex-row lg:items-center lg:gap-[72px] lg:px-16 lg:pt-12 lg:pb-24">
        <div className="flex flex-1 flex-col gap-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="font-display text-[44px] leading-[1.03] font-bold tracking-[-1px] text-foreground sm:text-[64px] lg:text-[80px] lg:leading-[82px] lg:tracking-[-2px]">
            {t.title}
          </h1>
          <p className="text-[17px] leading-[1.53] text-muted-foreground lg:text-[19px] lg:leading-[29px]">{t.body}</p>
        </div>
        <Snapshot
          src="/images/site/story-bakers.png"
          alt={t.imageAlt}
          tilt="right"
          priority
          sizes="(min-width: 1024px) 560px, 100vw"
          className="aspect-[7/8] w-full shrink-0 lg:aspect-auto lg:h-[640px] lg:w-[560px]"
        />
      </section>

      {/* Values */}
      <section className="grid w-full grid-cols-1 gap-10 bg-primary [--focus-ring:var(--white)] px-4 py-12 sm:px-8 md:grid-cols-3 lg:gap-12 lg:px-16 lg:py-14">
        {t.values.map((value, i) => (
          <div key={value.title} className="flex flex-col gap-3.5">
            <span className={cn("size-5 rounded-full", dots[i])} aria-hidden />
            <h2 className="font-display text-[28px] leading-[31px] font-bold text-foreground-inverse">{value.title}</h2>
            <p className="text-base leading-6 text-mint">{value.body}</p>
          </div>
        ))}
      </section>

      {/* Menu */}
      <section className="flex w-full flex-col gap-10 px-4 py-16 sm:px-8 lg:px-16 lg:py-28">
        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-end lg:gap-16">
          <div className="flex flex-1 flex-col gap-3">
            <Eyebrow>{t.menuEyebrow}</Eyebrow>
            <h2 className="font-display text-[40px] leading-[1.03] font-bold tracking-[-1px] text-foreground lg:text-[56px] lg:leading-[57px]">
              {t.menuTitle}
            </h2>
          </div>
          <p className="text-lg leading-[27px] text-muted-foreground lg:w-[400px] lg:shrink-0">{t.menuSub}</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {tiles.map((tile) => (
            <article key={tile.href} className={cn("group/tile flex flex-col gap-5 rounded-m p-5", tile.bg)}>
              <div className="relative h-[280px] w-full overflow-hidden rounded-sm">
                <Image
                  src={`/images/products/${tile.image}.png`}
                  alt=""
                  fill
                  quality={100}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-[scale,rotate] duration-500 ease-out group-hover/tile:scale-[1.06] group-hover/tile:-rotate-2 motion-reduce:transition-none motion-reduce:group-hover/tile:scale-100 motion-reduce:group-hover/tile:rotate-0"
                />
              </div>
              <div className="flex flex-col items-start gap-2.5 px-2 pb-2">
                <h3 className="font-display text-[30px] leading-[33px] font-bold text-foreground">{tile.title}</h3>
                <p className="text-[15px] leading-[23px] text-foreground">{tile.body}</p>
                <ArrowLink href={tile.href}>{tile.link}</ArrowLink>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Visit CTA */}
      <section className="w-full px-3 pb-16 md:px-6 lg:pb-28">
        <div className="flex w-full flex-col gap-8 rounded-m bg-mint px-6 py-10 sm:p-10 lg:flex-row lg:items-center lg:gap-12 lg:p-16">
          <div className="flex flex-1 flex-col gap-3">
            <h2 className="font-display text-[34px] leading-[1.03] font-bold tracking-[-1px] text-foreground lg:text-[48px] lg:leading-[49px]">
              {t.visitTitle}
            </h2>
            <p className="text-lg leading-[27px] text-muted-foreground">{t.visitBody}</p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <ButtonLink href="/location">{t.findStore}</ButtonLink>
            <ButtonLink href="/menu" variant="secondary">
              {t.viewMenu}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
