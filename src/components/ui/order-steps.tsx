import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type OrderStep = { label: string; state: "done" | "current" | "todo" };

/**
 * An order's progress as numbered circles joined by a line, the same language as the checkout header:
 * done is moss with a check, the current step mustard with a soft mustard ring, steps to come white with
 * a hairline ring (they sit on oat). The line into a step is moss once the order has reached it. Labels
 * sit centred under the circles at every width (two lines on phones when they need it).
 */
export function OrderSteps({
  steps,
  label,
  doneLabel,
  currentLabel,
  className,
}: {
  steps: readonly OrderStep[];
  /** Accessible name of the list, when no heading names it. */
  label?: string;
  doneLabel: string;
  currentLabel: string;
  className?: string;
}) {
  const reached = (i: number) => steps[i] !== undefined && steps[i].state !== "todo";
  const line = (on: boolean) => (on ? "h-[3px] bg-primary" : "h-0.5 bg-border-divider");

  return (
    <ol aria-label={label} className={cn("grid w-full", className)} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, i) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative flex min-w-0 flex-col items-center gap-2 text-center"
        >
          {/* Each step draws half of the line on either side of its circle; the circle covers the join. */}
          {i > 0 ? (
            <span aria-hidden className={cn("absolute top-4 right-1/2 left-0 -translate-y-1/2", line(reached(i)))} />
          ) : null}
          {i < steps.length - 1 ? (
            <span aria-hidden className={cn("absolute top-4 right-0 left-1/2 -translate-y-1/2", line(reached(i + 1)))} />
          ) : null}
          <span
            aria-hidden
            className={cn(
              "relative flex size-8 shrink-0 items-center justify-center rounded-pill text-sm leading-none font-bold tabular-nums",
              step.state === "done"
                ? "bg-primary text-primary-foreground"
                : step.state === "current"
                  ? "bg-highlight text-foreground ring-4 ring-tint-mustard"
                  : "bg-white text-muted-foreground inset-ring-1 inset-ring-border-subtle",
            )}
          >
            {step.state === "done" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
          </span>
          <span
            className={cn(
              "px-0.5 text-xs leading-4 text-balance sm:text-[13px] sm:leading-[18px]",
              step.state === "todo" ? "text-muted-foreground" : "font-semibold text-foreground",
            )}
          >
            {step.label}
            <span className="sr-only">
              {step.state === "done" ? ` (${doneLabel})` : step.state === "current" ? ` (${currentLabel})` : ""}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
