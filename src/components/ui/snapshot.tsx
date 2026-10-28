import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Editorial photo treated as a printed snapshot stuck on the page: 20px corners, a thin moss
 * outline drawn above the photo (inset, so it never changes the box) and a slight tilt.
 * For story, occasion and visit photos — product grid images stay square to the grid.
 * Hover effects (e.g. settling flat in a group) go in `className`.
 */
export type SnapshotTilt = "left" | "right" | "left-strong";

const tilts: Record<SnapshotTilt, string> = {
  left: "-rotate-[1.5deg]",
  right: "rotate-[1.5deg]",
  "left-strong": "-rotate-2 lg:-rotate-3",
};

export function Snapshot({
  src,
  alt,
  sizes,
  tilt = "left",
  priority,
  className,
  imageClassName,
}: {
  src: string;
  alt: string;
  sizes: string;
  tilt?: SnapshotTilt;
  priority?: boolean;
  /** Size/aspect of the frame, plus any hover classes. */
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-m bg-oat",
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-m after:inset-ring-[1.5px] after:inset-ring-border after:content-['']",
        "transition-[rotate,translate] duration-300 ease-out motion-reduce:transition-none",
        tilts[tilt],
        className,
      )}
    >
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
