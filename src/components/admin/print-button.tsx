"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Opens the browser's print dialog (the invoice page's own print CSS does the rest). */
export function PrintButton({ label, ariaLabel, className }: { label: string; ariaLabel?: string; className?: string }) {
  return (
    <Button onClick={() => window.print()} aria-label={ariaLabel} className={cn("print:hidden", className)}>
      <Printer className="size-[18px]" aria-hidden />
      {label}
    </Button>
  );
}
