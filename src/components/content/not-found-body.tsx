import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { photoFrame } from "@/components/ui/snapshot";
import { notFoundMessages } from "@/i18n/messages/pages/not-found";
import { getMessages } from "@/i18n/server";
import { cn } from "@/lib/cn";

const four = "font-display text-[96px] leading-[0.9] font-extrabold lg:text-[160px]";

/** "Try one of these instead": one favorite per category. Static, so the 404 never waits on the catalog. */
const picks = [
  { slug: "chocolate-chunk", name: "Chocolate Chunk" },
  { slug: "fudgy-brownies", name: "Fudgy Brownies" },
  { slug: "classic-coffee-tiramisu", name: "Classic Coffee Tiramisu" },
] as const;

/**
 * pen: Page not found (Ge2Dq), without the storefront chrome. The root 404 wraps
 * it in header and footer; inside the (shop) layout it renders as is. A caller
 * can swap the copy (an unknown product, a missing order) and keep the drawing.
 */
export async function NotFoundBody({ title, sub, menuLabel }: { title?: string; sub?: string; menuLabel?: string }) {
  const t = await getMessages(notFoundMessages);

  return (
    <>
      <section className="section-y flex w-full flex-col items-center gap-6 px-4 text-center sm:px-8 lg:gap-7 lg:px-16">
        <div className="flex items-center gap-2" aria-hidden>
          <span className={`${four} text-accent-magenta`}>4</span>
          <span className={cn(photoFrame, "size-[84px] shrink-0 rounded-pill bg-oat lg:size-[140px]")}>
            <Image
              src="/images/products/chocolate-chunk.png"
              alt=""
              fill
              priority
              quality={100}
              sizes="(min-width: 1024px) 140px, 84px"
              className="object-cover"
            />
          </span>
          <span className={`${four} text-accent-cobalt`}>4</span>
        </div>
        <h1 className="type-page max-w-[900px] font-display text-balance font-bold text-foreground">
          {title ?? t.title}
        </h1>
        <p className="max-w-[560px] text-balance text-[17px] leading-[1.53] text-muted-foreground sm:text-[19px] sm:leading-[29px]">
          {sub ?? t.sub}
        </p>
        <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <ButtonLink href="/menu" className="w-full max-w-[280px] sm:w-auto">
            {menuLabel ?? t.menu}
          </ButtonLink>
          <ButtonLink href="/" variant="secondary" className="w-full max-w-[280px] sm:w-auto">
            {t.home}
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="not-found-picks" className="w-full px-4 pb-12 sm:px-8 lg:px-16 lg:pb-20">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 pt-10 shadow-[inset_0_1px_0_var(--border-subtle)] lg:gap-8 lg:pt-14">
          <h2
            id="not-found-picks"
            className="type-section text-center font-display text-balance font-bold text-foreground"
          >
            {t.tryTitle}
          </h2>
          <ul className="grid w-full grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
            {picks.map((pick) => (
              <li key={pick.slug}>
                <Link
                  href={`/menu/${pick.slug}`}
                  className="group/pick flex h-full items-center gap-4 rounded-m bg-card p-3 md:flex-col md:items-stretch md:gap-5 md:p-4"
                >
                  <div className={cn(photoFrame, "size-24 shrink-0 md:aspect-[4/3] md:size-auto md:w-full")}>
                    <Image
                      src={`/images/products/${pick.slug}.png`}
                      alt=""
                      fill
                      quality={100}
                      sizes="(min-width: 768px) 340px, 96px"
                      className="object-cover transition-[scale] duration-500 ease-out group-hover/pick:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover/pick:scale-100"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 md:px-2 md:pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-[20px] leading-[24px] font-bold text-foreground lg:text-[22px] lg:leading-[26px]">
                        {pick.name}
                      </h3>
                      <ArrowRight
                        className="size-5 shrink-0 text-foreground transition-transform duration-200 ease-out group-hover/pick:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/pick:translate-x-0"
                        aria-hidden
                      />
                    </div>
                    <p className="text-pretty text-[15px] leading-[23px] text-muted-foreground">{t.picks[pick.slug]}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
