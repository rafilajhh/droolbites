import Image from "next/image";
import { cn } from "@/lib/cn";

/** pen: Order Line (bAwzK). Thumb 64 by default; summaries use 52. */
export function OrderLine({
  name,
  meta,
  price,
  imageUrl,
  thumb = 64,
  nameClassName,
  priceClassName,
  className,
}: {
  name: string;
  meta: React.ReactNode;
  price: React.ReactNode;
  imageUrl: string | null;
  thumb?: 52 | 64;
  nameClassName?: string;
  priceClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-center gap-4", className)}>
      <div
        className={cn("relative shrink-0 overflow-hidden rounded-sm bg-oat", thumb === 52 ? "size-[52px]" : "size-16")}
      >
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes="64px" quality={100} className="object-cover" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={cn("font-display text-[17px] font-semibold leading-[1.25] text-foreground", nameClassName)}>
          {name}
        </p>
        <p className="text-[13px] leading-normal text-muted-foreground">{meta}</p>
      </div>
      <p className={cn("shrink-0 text-[15px] font-bold leading-normal text-foreground", priceClassName)}>{price}</p>
    </div>
  );
}

/** pen: Summary Row (l8SNU). */
export function SummaryRow({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex w-full items-center justify-between", className)}>
      <span className={cn("text-[15px] leading-normal text-muted-foreground", labelClassName)}>{label}</span>
      <span className={cn("text-[15px] font-bold leading-normal text-foreground", valueClassName)}>{value}</span>
    </div>
  );
}
