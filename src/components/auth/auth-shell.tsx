import Image from "next/image";
import Link from "next/link";
import { getMessages } from "@/i18n/server";
import { authMessages } from "@/i18n/messages/auth";
import { cn } from "@/lib/cn";

export type AuthPhoto = "hero-cookies" | "gift-box" | "story-bakers" | "party-spread" | "store-front";

/**
 * pen: the shared auth layout (tjpUD, mjLE0, TwZFf, y7fayf, mK4mI).
 * 1440: 640px photo panel with logo + quote, form column centered in the rest.
 * Mobile: the photo collapses into a short banner above a full-width form.
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
    <div className="flex min-h-dvh w-full flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-start">
      <div
        className={cn(
          "relative isolate flex h-60 w-full shrink-0 flex-col justify-between overflow-hidden rounded-m p-6 [--focus-ring:var(--white)] sm:h-72",
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
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-foreground/0 from-45% to-foreground/80" aria-hidden />
        <Link href="/" aria-label={t.homeLink} className="w-fit rounded-full">
          <Image
            src="/images/site/logo-badge.png"
            alt=""
            width={96}
            height={96}
            quality={100}
            priority
            className="size-16 rounded-full lg:size-24"
          />
        </Link>
        <p className="font-display text-[28px] leading-[1.05] font-bold tracking-[-0.5px] text-white max-lg:text-balance lg:text-[40px]">
          {quote}
        </p>
      </div>
      <div className="flex w-full flex-1 flex-col items-center justify-start pb-6 lg:justify-center lg:min-h-[calc(100dvh-48px)] lg:pb-0">
        <main className="flex w-full max-w-[440px] flex-col gap-5">{children}</main>
      </div>
    </div>
  );
}
