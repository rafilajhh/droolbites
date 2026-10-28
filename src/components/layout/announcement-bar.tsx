import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { formatOpeningHours } from "@/components/content/hours";
import { getLocale, getMessages } from "@/i18n/server";
import { commonMessages } from "@/i18n/messages/common";
import { getStoreSettings } from "@/lib/settings";

/**
 * Thin moss strip above the sticky header. It scrolls away with the page; the header
 * below keeps its own sticky/condense behavior. Hours come from the store settings.
 */
export async function AnnouncementBar() {
  const [t, locale, settings] = await Promise.all([getMessages(commonMessages), getLocale(), getStoreSettings()]);
  const a = t.announce;

  return (
    <aside
      aria-label={a.label}
      className="w-full bg-primary [--focus-ring:var(--white)] px-4 py-2 text-white md:px-8"
    >
      <p className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center font-mono text-[12px] leading-[18px] font-semibold sm:text-[13px] sm:leading-[20px]">
        <span className="hidden md:inline">{a.fresh}</span>
        <span className="hidden size-1.5 rounded-full bg-highlight md:inline-block" aria-hidden />
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0 text-highlight" aria-hidden />
          <span>
            <span className="hidden sm:inline">{a.hoursLabel} </span>
            {a.hours(formatOpeningHours(settings, locale))}
          </span>
        </span>
        <Link
          href="/menu"
          className="group relative inline-flex items-center gap-1 underline decoration-white/60 decoration-1 underline-offset-[3px] after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:decoration-white"
        >
          {a.cta}
          <ArrowRight
            className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </Link>
      </p>
    </aside>
  );
}
