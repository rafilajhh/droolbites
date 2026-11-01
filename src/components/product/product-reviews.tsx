import { Quote, Star } from "lucide-react";
import { Sticker } from "@/components/ui/badges";
import { getLocale, getMessages } from "@/i18n/server";
import { productMessages } from "@/i18n/messages/product";
import { cn } from "@/lib/cn";
import { getStoreSettings } from "@/lib/settings";
import { formatRating, productRatings, productReviews } from "./reviews";

/** Review panels alternate between two tints; mustard is left to the ordering strip below. */
const tints = ["bg-tint-lavender", "bg-tint-lime"];

/** "What regulars say" on the product page: the product rating and two short reviews. */
export async function ProductReviews({ slug }: { slug: string }) {
  const reviews = productReviews[slug];
  const rating = productRatings[slug];
  if (!reviews?.length || !rating) return null;
  const [t, locale, settings] = await Promise.all([getMessages(productMessages), getLocale(), getStoreSettings()]);

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-title"
      className="flex w-full scroll-mt-[88px] flex-col gap-8 px-4 pb-20 sm:px-8 lg:flex-row lg:gap-12 lg:px-16 lg:pb-28 xl:gap-[72px]"
    >
      <div className="flex w-full flex-col items-start gap-4 lg:w-[340px] lg:shrink-0 lg:pt-2">
        <h2
          id="reviews-title"
          className="font-display text-[32px] leading-[35px] font-bold tracking-[-1px] text-balance text-foreground lg:text-[44px] lg:leading-[46px]"
        >
          {t.reviews.title}
        </h2>
        <p className="max-w-[560px] text-pretty text-base leading-[24px] text-muted-foreground">{t.reviews.sub}</p>
        <Sticker className="mt-2 ml-1 gap-2 rotate-[-4deg]">
          <Star className="size-4 shrink-0 fill-highlight text-foreground" aria-hidden />
          <span className="sr-only">{t.rating.rated} </span>
          {formatRating(rating.value, locale)}
          <span className="sr-only"> {t.rating.outOf}</span>
          <span aria-hidden>·</span>
          {t.rating.count(rating.count)}
        </Sticker>
      </div>
      <ul className="grid w-full min-w-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
        {reviews.map((review, i) => (
          <li key={review.name} className={cn("flex flex-col rounded-m p-6 lg:p-8", tints[i % tints.length])}>
            <figure className="flex flex-1 flex-col gap-5">
              <div className="flex items-center justify-between gap-4">
                <Quote className="size-7 text-primary" aria-hidden />
                <p className="flex gap-0.5">
                  <span className="sr-only">{t.reviews.stars(review.stars)}</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn(
                        "size-4 text-foreground",
                        n <= review.stars ? "fill-highlight" : "fill-transparent opacity-40",
                      )}
                      aria-hidden
                    />
                  ))}
                </p>
              </div>
              <blockquote className="flex-1 font-display text-[22px] leading-[29px] font-semibold text-pretty text-foreground">
                {review.quote[locale]}
              </blockquote>
              <figcaption className="flex flex-col">
                <span className="text-base leading-6 font-bold text-foreground">{review.name}</span>
                <span className="font-mono text-[13px] leading-5 font-semibold text-muted-foreground">
                  {review.area}, {settings.city}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
