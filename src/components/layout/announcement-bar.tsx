import { Clock } from "lucide-react";
import { formatOpeningHours } from "@/components/content/hours";
import { getLocale, getMessages } from "@/i18n/server";
import { commonMessages } from "@/i18n/messages/common";
import { getStoreSettings } from "@/lib/settings";

/**
 * Thin moss strip above the sticky header. It scrolls away with the page; the header
 * below stays sticky. Hours come from the store settings.
 */
export async function AnnouncementBar() {
  const [t, locale, settings] = await Promise.all([getMessages(commonMessages), getLocale(), getStoreSettings()]);
  const a = t.announce;

  return (
    <aside
      aria-label={a.label}
      className="w-full bg-primary [--focus-ring:var(--white)] px-4 py-2 text-white md:px-8"
    >
      <p className="mx-auto flex max-w-[1440px] items-center justify-center gap-1.5 text-center font-mono text-[12px] leading-[18px] font-semibold sm:text-[13px] sm:leading-[20px]">
        <Clock className="size-3.5 shrink-0 text-highlight" aria-hidden />
        <span>
          <span className="hidden sm:inline">{a.hoursLabel} </span>
          {a.hours(formatOpeningHours(settings, locale))}
        </span>
      </p>
    </aside>
  );
}
