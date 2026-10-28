import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * pen: Card/Product (jkyzH) — 280×440 oat card, photo on top, title below.
 * The whole card links to the product page.
 */
export function ProductCard({
  href,
  name,
  imageUrl,
  linkLabel,
}: {
  href: string;
  name: string;
  imageUrl: string;
  linkLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-[440px] w-full flex-col justify-between overflow-hidden rounded-m bg-card transition-colors hover:bg-card-accent"
    >
      <span className="relative block h-[260px] w-full shrink-0">
        <Image src={imageUrl} alt="" fill sizes="280px" quality={100} className="object-cover" />
      </span>
      <span className="flex w-full flex-col gap-3 px-6 pb-6">
        <span className="font-display text-[28px] leading-[1.1] font-medium text-foreground">{name}</span>
        {linkLabel ? (
          <span className="inline-flex w-fit items-center gap-1.5 pb-1 font-display text-[15px] leading-[1.2] font-semibold shadow-[inset_0_-1.25px_0_var(--border)]">
            {linkLabel}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        ) : null}
      </span>
    </Link>
  );
}
