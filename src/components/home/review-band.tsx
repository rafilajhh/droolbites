import Image from "next/image";
import { Quote, Star } from "lucide-react";
import { Sticker } from "@/components/ui/badges";
import { ArrowLink } from "@/components/ui/button";
import { Cutout } from "@/components/ui/snapshot";
import type { ShopProduct } from "@/components/shop/shop-product";
import { cn } from "@/lib/cn";

type Review = { quote: string; name: string; area: string };

/** The product each illustrative reviewer orders, in the order of `items` (featured first). */
const picks = ["red-velvet", "double-chocolate", "white-chocolate-almond"];
/** The two smaller quotes sit on the moss like notes pinned at slightly different angles. */
const noteTilts = ["-rotate-[1.5deg]", "rotate-[1.5deg] lg:ml-8"];

const whiteLink = "text-foreground-inverse shadow-[inset_0_-1.25px_0_var(--white)]";

/**
 * Home social proof: a moss panel with one large featured quote and a stack of two
 * smaller paper notes, so it reads differently from the three-up review cards on
 * Location and FAQ. Quotes and the rating are illustrative (owner-approved dummy content).
 */
export function ReviewBand({
  t,
  products,
  city,
}: {
  t: { title: string; rating: string; more: string; try: (name: string) => string; items: readonly Review[] };
  products: ShopProduct[];
  city: string;
}) {
  const reviews = t.items
    .map((review, i) => ({ ...review, product: products.find((p) => p.slug === picks[i]) }))
    .filter((r): r is Review & { product: ShopProduct } => Boolean(r.product));
  if (!reviews.length) return null;
  const [featured, ...notes] = reviews;

  return (
    <section className="w-full px-3 pt-20 sm:px-6 lg:pt-28" aria-labelledby="home-reviews">
      <div className="relative grid w-full grid-cols-1 gap-12 rounded-m bg-primary [--focus-ring:var(--white)] px-5 py-12 sm:px-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-16 lg:px-16 lg:py-[88px] xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-24">
        <Cutout
          name="white-chocolate-almond"
          width={128}
          className="-top-12 right-10 hidden rotate-12 lg:block"
        />
        <div className="flex min-w-0 flex-col items-start gap-10">
          <div className="flex flex-col items-start gap-5">
            <h2
              id="home-reviews"
              className="font-display text-[34px] leading-[36px] font-bold tracking-[-1px] text-balance text-foreground-inverse sm:text-[44px] sm:leading-[46px]"
            >
              {t.title}
            </h2>
            <Sticker className="gap-2 rotate-[-4deg]">
              <Star className="size-4 shrink-0 fill-highlight text-foreground" aria-hidden />
              {t.rating}
            </Sticker>
          </div>
          <figure className="flex flex-col gap-6">
            <Quote className="size-10 text-highlight" aria-hidden />
            <blockquote className="max-w-[640px] font-display text-[26px] leading-[32px] font-bold tracking-[-0.5px] text-pretty text-foreground-inverse lg:text-[36px] lg:leading-[40px]">
              {featured.quote}
            </blockquote>
            <figcaption className="flex items-center gap-4">
              <span className="relative size-16 shrink-0 -rotate-3 overflow-hidden rounded-sm bg-oat">
                <Image src={featured.product.imageUrl} alt="" fill sizes="64px" className="object-cover" />
              </span>
              <span className="flex flex-col">
                <span className="text-lg leading-6 font-bold text-foreground-inverse">{featured.name}</span>
                <span className="font-mono text-[13px] leading-5 font-semibold text-mint">
                  {featured.area}, {city}
                </span>
              </span>
            </figcaption>
          </figure>
          <ArrowLink href={`/menu/${featured.product.slug}`} className={whiteLink}>
            {t.try(featured.product.name)}
          </ArrowLink>
        </div>

        {notes.length ? (
          <ul aria-label={t.more} className="flex flex-col gap-6 lg:gap-8">
            {notes.map((review, i) => (
              <li
                key={review.name}
                className={cn(
                  "flex flex-col gap-5 rounded-m bg-background p-6 transition-[rotate] duration-300 ease-out hover:rotate-0 motion-reduce:transition-none lg:p-7",
                  noteTilts[i],
                )}
              >
                <figure className="flex flex-col gap-5">
                  <blockquote className="font-display text-[20px] leading-[26px] font-semibold text-pretty text-foreground">
                    {review.quote}
                  </blockquote>
                  <figcaption className="flex items-center gap-3.5">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-pill bg-oat">
                      <Image src={review.product.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-base leading-6 font-bold text-foreground">{review.name}</span>
                      <span className="font-mono text-[13px] leading-5 font-semibold text-muted-foreground">
                        {review.area}, {city}
                      </span>
                    </span>
                  </figcaption>
                </figure>
                <ArrowLink href={`/menu/${review.product.slug}`} className="w-fit">
                  {t.try(review.product.name)}
                </ArrowLink>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
