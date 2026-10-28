"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60].map(pad).join(" : ");
}

/** "23 : 41 : 08" until the payment expires; refreshes the page at zero so the server can mark it expired. */
export function Countdown({ expiresAt, label }: { expiresAt: string; label: string }) {
  const router = useRouter();
  const end = new Date(expiresAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= end) {
        window.clearInterval(id);
        router.refresh();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [end, router]);

  return (
    <span
      role="timer"
      aria-label={label}
      suppressHydrationWarning
      className="font-mono text-xl leading-6 font-semibold whitespace-nowrap text-foreground tabular-nums sm:text-2xl"
    >
      {parts(end - now)}
    </span>
  );
}
