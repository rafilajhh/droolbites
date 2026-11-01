import Image from "next/image";
import Link from "next/link";
import { getMessages } from "@/i18n/server";
import { authMessages } from "@/i18n/messages/auth";
import { cn } from "@/lib/cn";

export type AuthPhoto = "hero-cookies" | "gift-box" | "story-bakers" | "party-spread" | "store-front";

/**
 * pen: the shared auth layout (tjpUD, mjLE0, TwZFf, y7fayf, mK4mI).
 * 1440: 640px photo panel with logo + quote, form column centered in the rest.
 * Below sm: a slim photo banner (logo beside the quote) so the form's submit
 * button stays inside the first screen at 390×844, Google button included.
 */
export async function AuthShell({
  photo,
  quote,
  children,
}: {
  photo: AuthPhoto;
  quote: string;
  children: React.ReactNode;
}) {
  const t = await getMessages(authMessages);
  return (
    <div className="flex min-h-dvh w-full flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:flex-row lg:items-start">
      <div
        className={cn(
          "relative isolate flex min-h-22 w-full shrink-0 items-center gap-3 overflow-hidden rounded-m px-4 py-3 [--focus-ring:var(--white)]",
          "sm:h-72 sm:flex-col sm:items-stretch sm:justify-between sm:gap-0 sm:p-6",
          "lg:sticky lg:top-6 lg:h-[calc(100dvh-48px)] lg:min-h-[640px] lg:w-[45%] xl:w-[640px] lg:p-8",
        )}
      >
        <Image
          src={`/images/site/${photo}.png`}
          alt=""
          fill
          priority
          quality={100}
          sizes="(min-width: 1024px) 640px, 100vw"
          className="-z-10 object-cover"
        />
        <div
          className="absolute inset-0 -z-10 bg-foreground/55 sm:bg-transparent sm:bg-linear-to-b sm:from-foreground/0 sm:from-45% sm:to-foreground/80"
          aria-hidden
        />
        <Link href="/" aria-label={t.homeLink} className="w-fit shrink-0 rounded-full">
          <Image
            src="/images/site/logo-badge.png"
            alt=""
            width={96}
            height={96}
            quality={100}
            priority
            className="size-12 rounded-full sm:size-16 lg:size-24"
          />
        </Link>
        <p className="font-display text-lg leading-[1.15] font-bold tracking-[-0.25px] text-white text-balance sm:text-[28px] sm:leading-[1.05] sm:tracking-[-0.5px] lg:text-[40px]">
          {quote}
        </p>
      </div>
      <div className="flex w-full flex-1 flex-col items-center justify-start pb-6 lg:justify-center lg:min-h-[calc(100dvh-48px)] lg:pb-0">
        <main className="flex w-full max-w-[440px] flex-col gap-5">{children}</main>
      </div>
    </div>
  );
}
