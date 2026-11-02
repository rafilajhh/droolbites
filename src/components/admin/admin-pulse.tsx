"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BellRing, X } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";

const POLL_MS = 15_000;

/**
 * Keeps an open admin up to date: every 15 s while the tab is visible it asks whether a new paid
 * order came in. When one did, the page data refreshes (dashboard, lists, the sidebar badge) and a
 * card pops up with a link to it. The tab title carries the count of orders waiting for a decision.
 */
export function AdminPulse({ newOrders, latest }: { newOrders: number; latest: string | null }) {
  const t = useMessages(adminMessages).sidebar;
  const router = useRouter();
  const pathname = usePathname();
  const seen = useRef({ newOrders, latest });
  const [toast, setToast] = useState<string | null>(null);

  // A refresh brings new props: they become what has been seen.
  useEffect(() => {
    seen.current = { newOrders, latest };
  }, [newOrders, latest]);

  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const res = await fetch("/api/admin/pulse", { cache: "no-store" });
        if (!res.ok) return;
        const now = (await res.json()) as { newOrders: number; latest: string | null };
        const arrived = now.latest !== null && now.latest !== seen.current.latest;
        if (arrived) setToast(now.latest);
        if (arrived || now.newOrders !== seen.current.newOrders) {
          seen.current = now;
          router.refresh();
        }
      } catch {
        // Offline for a moment: the next tick tries again.
      } finally {
        busy = false;
      }
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);

  // "(2) Orders · Droolbites": the count shows on the tab even when another tab is in front.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const base = document.title.replace(/^\(\d+\) /, "");
      document.title = newOrders > 0 ? `(${newOrders}) ${base}` : base;
    }, 50);
    return () => window.clearTimeout(id);
  }, [newOrders, pathname]);

  // Already looking at that order: the card has nothing to add.
  const shown = toast && pathname !== `/admin/orders/${toast}` ? toast : null;

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-40 flex justify-end sm:left-auto">
      {shown ? (
        <div className="pointer-events-auto flex w-full max-w-[380px] items-center gap-3 rounded-m bg-white p-4 shadow-[0_12px_32px_rgb(31_42_20/0.15)] inset-ring-1 inset-ring-border-subtle">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-highlight">
            <BellRing className="size-5 text-foreground" aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-[15px] leading-[21px] font-semibold text-foreground">{t.pulse(shown)}</p>
          <Link
            href={`/admin/orders/${shown}`}
            onClick={() => setToast(null)}
            className="shrink-0 rounded-sm bg-primary px-3.5 py-2.5 font-display text-[13px] leading-4 font-semibold tracking-[0.5px] text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {t.pulseView}
          </Link>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label={t.pulseClose}
            className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <X className="size-[18px]" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
