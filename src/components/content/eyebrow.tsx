import { cn } from "@/lib/cn";

/** The mono eyebrow above page titles (13/20, 1px tracking, moss). */
export function Eyebrow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p className={cn("font-mono text-[13px] leading-5 font-semibold tracking-[1px] text-primary", className)}>
      {children}
    </p>
  );
}
