"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BellRing, X } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import type { AdminPulse as Pulse } from "@/lib/admin-pulse";

const POLL_MS = 15_000;
const PREFIX = /^\(\d+\) /;

/** "(2) Orders · Droolbites": the count of orders waiting for a decision, shown on the tab. */
function titled(count: number) {
  const base = document.title.replace(PREFIX, "");
  const want = count > 0 ? `(${count}) ${base}` : base;
  if (document.title !== want) document.title = want;
}

/**
 * Keeps an open admin up to date: every 15 s it asks for the number of paid orders waiting for a
 * decision and the time of the latest payment. The tab title count follows even while the tab is in
 * the background. When a payment newer than any seen before comes in, the page data refreshes
 * (dashboard, lists, sidebar badge) and a card pops up with a link to that order.
 */
export function AdminPulse({ newOrders, latest, paidAt }: Pulse) {
  const t = useMessages(adminMessages).sidebar;
  const router = useRouter();
  const pathname = usePathname();
  const [toast, setToast] = useState<string | null>(null);
  // What the page shows now (props after a refresh) and the newest payment already announced.
  const shown = useRef({ newOrders, paidAt });
  const announced = useRef(paidAt);
  const count = useRef(newOrders);

  useEffect(() => {
    shown.current = { newOrders, paidAt };
    count.current = newOrders;
    titled(newOrders);
  }, [newOrders, paidAt]);

  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        const res = await fetch("/api/admin/pulse", { cache: "no-store" });
        if (!res.ok) return;
        const now = (await res.json()) as Pulse;
        count.current = now.newOrders;
        titled(now.newOrders);
        // In the background only the tab title follows; the card and refresh wait until the admin is back.
        if (document.visibilityState !== "visible") return;
        if (now.paidAt > announced.current && now.latest) {
          announced.current = now.paidAt;
          setToast(now.latest);
        }
        if (now.newOrders !== shown.current.newOrders || now.paidAt !== shown.current.paidAt) {
          shown.current = { newOrders: now.newOrders, paidAt: now.paidAt };
          router.refresh();
        }
      } catch {
        // Offline for a moment: the next tick tries again.
      } finally {
        busy = false;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    // Next sets the page title after navigation; put the count back when it does.
    const head = new MutationObserver(() => titled(count.current));
    head.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      head.disconnect();
    };
  }, [router]);

  // Already looking at that order: the card has nothing to add.
  const card = toast && pathname !== `/admin/orders/${toast}` ? toast : null;

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-40 flex justify-end sm:left-auto">
      {card ? (
        <div className="pointer-events-auto flex w-full max-w-[380px] items-center gap-3 rounded-m bg-white p-4 shadow-[0_12px_32px_rgb(31_42_20/0.15)] inset-ring-1 inset-ring-border-subtle">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-highlight">
            <BellRing className="size-5 text-foreground" aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-[15px] leading-[21px] font-semibold text-foreground">{t.pulse(card)}</p>
          <Link
            href={`/admin/orders/${card}`}
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
