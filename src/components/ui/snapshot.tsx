import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The one photo frame on the storefront: 20px corners and a 1.5px moss outline drawn above
 * the photo by an `after:` layer (inset, so it never changes the box). Photos sit flat.
 * Small thumbnails (under ~80px) override the radius with `rounded-sm`, round avatars with
 * `rounded-pill`; the outline follows via `rounded-[inherit]`. Put it first in `cn()`.
 */
export const photoFrame =
  "relative overflow-hidden rounded-m after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:inset-ring-[1.5px] after:inset-ring-border after:content-['']";

/**
 * Editorial photo in the shared `photoFrame` on an oat placeholder, for story, occasion and
 * visit photos. Size, aspect and position go in `className`.
 */
export function Snapshot({
  src,
  alt,
  sizes,
  priority,
  className,
  imageClassName,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Size/aspect/position of the frame. */
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div className={cn(photoFrame, "bg-oat", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        quality={100}
        sizes={sizes}
        className={cn("object-cover", imageClassName)}
      />
    </div>
  );
}

/** Transparent cookie cut-outs in public/images/cutouts (made from the product photos). */
export type CutoutName = "chocolate-chunk" | "double-chocolate" | "red-velvet" | "white-chocolate-almond";

const cutoutSize: Record<CutoutName, [number, number]> = {
  "chocolate-chunk": [932, 738],
  "double-chocolate": [829, 680],
  "red-velvet": [882, 700],
  "white-chocolate-almond": [961, 744],
};

/**
 * Purely decorative cookie scattered over a panel edge. Hidden from assistive tech and
 * never clickable; callers position it (absolute) and hide it where it would crowd text.
 */
export function Cutout({ name, width, className }: { name: CutoutName; width: number; className?: string }) {
  const [w, h] = cutoutSize[name];
  return (
    <Image
      src={`/images/cutouts/${name}.png`}
      alt=""
      aria-hidden
      width={w}
      height={h}
      quality={100}
      sizes={`${width}px`}
      draggable={false}
      style={{ width, height: "auto" }}
      className={cn(
        "pointer-events-none absolute drop-shadow-[0_10px_12px_color-mix(in_srgb,var(--ink)_22%,transparent)] select-none",
        className,
      )}
    />
  );
}
