"use client";

import { useState } from "react";
import Image from "next/image";
import { Sticker } from "@/components/ui/badges";
import { photoFrame } from "@/components/ui/snapshot";
import { useMessages } from "@/i18n/client";
import { productMessages } from "@/i18n/messages/product";
import { cn } from "@/lib/cn";

/**
 * `zoom` crops into the photo (a close-up, or the product's corner of a lifestyle shot).
 * `plate` shows a transparent cut-out on a tinted panel (a bg-tint-* class).
 */
export type GalleryPhoto = {
  src: string;
  alt: string;
  zoom?: { scale: number; origin: string; position?: string };
  plate?: string;
};

/** One photo filling its frame; the main view and the thumbnails share it. */
function GalleryImage({
  photo,
  alt,
  sizes,
  priority,
}: {
  photo: GalleryPhoto;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  if (photo.plate) {
    return (
      <span className={cn("absolute inset-0 flex items-center justify-center", photo.plate)}>
        <span className="relative size-[74%]">
          <Image
            src={photo.src}
            alt={alt}
            fill
            priority={priority}
            quality={100}
            sizes={sizes}
            className="object-contain drop-shadow-[0_10px_12px_color-mix(in_srgb,var(--ink)_22%,transparent)]"
          />
        </span>
      </span>
    );
  }
  return (
    <Image
      src={photo.src}
      alt={alt}
      fill
      priority={priority}
      quality={100}
      sizes={sizes}
      className="object-cover"
      style={
        photo.zoom
          ? {
              scale: String(photo.zoom.scale),
              transformOrigin: photo.zoom.origin,
              objectPosition: photo.zoom.position,
            }
          : undefined
      }
    />
  );
}

/** Thumbnail row by photo count; static classes so Tailwind sees them. Each thumb keeps a 150px-tall shape at 680px. */
const thumbGrid: Partial<Record<number, { cols: string; aspect: string }>> = {
  2: { cols: "grid-cols-2", aspect: "aspect-[332/150]" },
  3: { cols: "grid-cols-3", aspect: "aspect-[217/150]" },
  4: { cols: "grid-cols-4", aspect: "aspect-[158/150]" },
};

/** pen: product detail Gallery — 640px main photo and up to four 150px thumbnails. */
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
  const thumbs = thumbGrid[photos.length] ?? thumbGrid[4]!;

  return (
    <section
      aria-label={t.gallery}
      className="flex w-full flex-col gap-3 sm:gap-4 lg:w-[560px] lg:shrink-0 xl:w-[680px]"
    >
      <div className="relative w-full">
        <div className={cn(photoFrame, "aspect-[680/640] w-full bg-oat")}>
          <GalleryImage
            key={index}
            photo={current}
            alt={current.alt}
            priority={index === 0}
            sizes="(min-width: 1280px) 680px, (min-width: 1024px) 560px, 100vw"
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
      {/* Two to four thumbnails, one column each, so the row always spans the photo. */}
      <div className={cn("grid w-full gap-3 sm:gap-4", thumbs.cols)}>
        {photos.map((photo, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={t.showPhoto(photo.alt)}
            aria-pressed={i === index}
            className={cn(
              photoFrame,
              "w-full rounded-sm bg-oat transition-opacity sm:rounded-m hover:opacity-90",
              thumbs.aspect,
              i === index && "after:inset-ring-[3px]",
            )}
          >
            <GalleryImage photo={photo} alt="" sizes="(min-width: 1280px) 220px, 33vw" />
          </button>
        ))}
      </div>
    </section>
  );
}
