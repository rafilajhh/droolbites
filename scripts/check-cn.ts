// Sanity check for the tailwind-merge config in src/lib/cn.ts: npx tsx scripts/check-cn.ts
import { cn } from "../src/lib/cn";

const cases: Array<[string, string, string]> = [
  ["inline-flex items-center rounded-pill", "mr-3 hidden sm:inline-flex", "items-center rounded-pill mr-3 hidden sm:inline-flex"],
  ["rounded-sm px-7 text-[15px] font-display text-foreground", "rounded-m text-muted-foreground", "px-7 text-[15px] font-display rounded-m text-muted-foreground"],
  ["bg-primary text-primary-foreground", "w-full", "bg-primary text-primary-foreground w-full"],
  ["text-[15px] leading-[23px] text-foreground", "text-lg", "text-foreground text-lg"],
  ["font-display text-[22px]", "font-body", "text-[22px] font-body"],
  ["inset-ring-[1.25px] inset-ring-border-subtle", "inset-ring-[1.5px] inset-ring-border", "inset-ring-[1.5px] inset-ring-border"],
];

let failed = 0;
for (const [a, b, expected] of cases) {
  const got = cn(a, b);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} cn(${JSON.stringify(a)}, ${JSON.stringify(b)}) = ${JSON.stringify(got)}`);
}
process.exit(failed ? 1 : 0);
