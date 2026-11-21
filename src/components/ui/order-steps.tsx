import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/** `time`: when the step was reached ("14:05"), shown small under its label; omitted when unknown. */
export type OrderStep = { label: string; state: "done" | "current" | "todo"; time?: string };

/**
 * An order's progress as numbered circles on one line, the same language as the checkout header: done
 * is moss with a check, the current step mustard with a soft mustard ring, steps to come white with a
 * hairline ring (they sit on oat). The line is moss up to the furthest step reached.
 *
 * The first and last circles sit on the content edges, like the text above and below, and the steps
 * are evenly spaced between them. Each label sits under its circle (the end ones aligned to the edge)
 * once the bar is at least 36rem wide; narrower than that (phones, the order page's column at lg)
 * five labels don't fit, so one caption above the bar says "Step 2 of 5 · Confirmed" instead and the
 * labels stay for screen readers.
 */
export function OrderSteps({
  steps,
  label,
  doneLabel,
  currentLabel,
  stepOf,
  className,
}: {
  steps: readonly OrderStep[];
  /** Accessible name of the list, when no heading names it. */
  label?: string;
  doneLabel: string;
  currentLabel: string;
  /** "Step 2 of 5" for the narrow caption. */
  stepOf: (n: number, total: number) => string;
  className?: string;
}) {
  const last = steps.length - 1;
  const reached = steps.findLastIndex((s) => s.state !== "todo");
  // The caption names the current step; a finished order (all done) names the last one.
  const shown = steps.findIndex((s) => s.state === "current");
  const at = shown >= 0 ? shown : Math.max(reached, 0);
  // Half-width columns: the end steps take one (their circle on the edge), the others two (centred).
  const column = (i: number) => (i === 0 ? "1 / span 1" : i === last ? `${2 * last} / span 1` : `${2 * i} / span 2`);

  return (
    <div className={cn("@container flex w-full flex-col gap-3", className)}>
      <p aria-hidden className="text-[13px] leading-[18px] text-muted-foreground @min-[36rem]:hidden">
        {stepOf(at + 1, steps.length)} · <span className="font-semibold text-foreground">{steps[at]?.label}</span>
        {steps[at]?.time ? <span className="tabular-nums"> · {steps[at].time}</span> : null}
      </p>
      <ol
        aria-label={label}
        className="relative grid w-full gap-y-2"
        style={{ gridTemplateColumns: `repeat(${Math.max(2 * last, 1)}, minmax(0, 1fr))` }}
      >
        {/* The line runs between the outer circles' centres; the moss part ends at the furthest step reached. */}
        <span aria-hidden className="absolute top-4 right-4 left-4 h-0.5 -translate-y-1/2 bg-border-divider" />
        <span
          aria-hidden
          className="absolute top-4 left-4 h-[3px] -translate-y-1/2 bg-primary"
          style={{ width: last > 0 ? `calc((100% - 2rem) * ${Math.max(reached, 0) / last})` : 0 }}
        />
        {steps.map((step, i) => (
          <li
            key={step.label}
            aria-current={step.state === "current" ? "step" : undefined}
            style={{ gridColumn: column(i) }}
            className={cn(
              "relative flex min-w-0 flex-col gap-2",
              i === 0 ? "items-start text-left" : i === last ? "items-end text-right" : "items-center text-center",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-pill text-sm leading-none font-bold tabular-nums",
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
                // A middle label wraps within its own stretch of the line; an end label within half of it.
                "w-max max-w-[calc(100%-12px)] text-[13px] leading-[18px] text-balance @max-[36rem]:sr-only",
                (i === 0 || i === last) && "max-w-full",
                step.state === "todo" ? "text-muted-foreground" : "font-semibold text-foreground",
              )}
            >
              {step.label}
              {step.time ? (
                <span className="block text-xs leading-4 font-normal text-muted-foreground tabular-nums">{step.time}</span>
              ) : null}
              <span className="sr-only">
                {step.state === "done" ? ` (${doneLabel})` : step.state === "current" ? ` (${currentLabel})` : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
