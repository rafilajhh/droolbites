"use client";

import { useState } from "react";
import Image from "next/image";
import { Sticker } from "@/components/ui/badges";
import { useMessages } from "@/i18n/client";
import { productMessages } from "@/i18n/messages/product";
import { cn } from "@/lib/cn";

export type GalleryPhoto = { src: string; alt: string };

/** pen: product detail Gallery — 640px main photo and four 150px thumbnails. */
export function ProductGallery({
  photos,
  badge,
}: {
  photos: GalleryPhoto[];
  badge?: { label: string; className: string };
}) {
  const t = useMessages(productMessages);
  const [index, setIndex] = useState(0);
  const current = photos[index];

  return (
    <section
      aria-label={t.gallery}
      className="flex w-full flex-col gap-3 sm:gap-4 lg:w-[560px] lg:shrink-0 xl:w-[680px]"
    >
      <div className="relative w-full">
        <div className="relative aspect-[680/640] w-full overflow-hidden rounded-m bg-oat">
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt}
            fill
            priority={index === 0}
            quality={100}
            sizes="(min-width: 1280px) 680px, (min-width: 1024px) 560px, 100vw"
            className="object-cover"
          />
        </div>
        {badge && index === 0 ? (
          <Sticker
            size="sm"
            className={cn(
              "absolute -top-2.5 -left-1.5 sm:-top-3.5 sm:-left-3 sm:px-4 sm:py-2.5 sm:text-sm sm:leading-[18px]",
              badge.className,
            )}
          >
            {badge.label}
          </Sticker>
        ) : null}
      </div>
      <div className="grid w-full grid-cols-4 gap-3 sm:gap-4">
        {photos.map((photo, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={t.showPhoto(photo.alt)}
            aria-pressed={i === index}
            className={cn(
              "relative aspect-[158/150] w-full overflow-hidden rounded-sm bg-oat transition-opacity hover:opacity-90",
              i === index && "after:absolute after:inset-0 after:rounded-sm after:inset-ring-2 after:inset-ring-border",
            )}
          >
            <Image
              src={photo.src}
              alt=""
              fill
              quality={100}
              sizes="(min-width: 1280px) 158px, 25vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
