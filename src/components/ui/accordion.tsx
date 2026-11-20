import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * pen: Accordion Item (g2CkW). Native <details> so it works without JS.
 * By default the toggle icon rotates into an × when open. `openStyle="minus"`
 * is the FAQ frame's open state: a moss toggle with a white minus.
 */
export function AccordionItem({
  question,
  children,
  defaultOpen,
  openStyle = "rotate",
  className,
  questionClassName,
}: {
  question: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  openStyle?: "rotate" | "minus";
  className?: string;
  questionClassName?: string;
}) {
  const minus = openStyle === "minus";
  return (
    <details
      open={defaultOpen}
      className={cn("group w-full py-6 shadow-[inset_0_-1px_0_var(--border-subtle)]", className)}
    >
      {/* The 36px +/− sets the row height; the hit-slop takes the tap area to 52px inside the row's padding. */}
      <summary className="relative flex w-full cursor-pointer list-none items-center gap-6 after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] [&::-webkit-details-marker]:hidden">
        <span
          className={cn(
            "flex-1 font-display text-[22px] font-semibold leading-[1.25] text-foreground",
            questionClassName,
          )}
        >
          {question}
        </span>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-pill bg-oat transition-transform motion-reduce:transition-none",
            minus ? "group-open:bg-primary group-open:text-primary-foreground" : "group-open:rotate-45",
          )}
        >
          <Plus className={cn("size-[18px]", minus && "group-open:hidden")} aria-hidden />
          {minus ? <Minus className="hidden size-[18px] group-open:block" aria-hidden /> : null}
        </span>
      </summary>
      <div className="pt-3 text-base leading-normal text-muted-foreground">{children}</div>
    </details>
  );
}
