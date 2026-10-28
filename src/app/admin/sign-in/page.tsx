import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AdminSignInForm } from "@/components/admin/sign-in-form";
import { getCurrentUser } from "@/lib/auth";
import { getStoreSettings } from "@/lib/settings";
import { getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(adminMessages);
  return { title: t.meta.signIn, robots: { index: false, follow: false } };
}

/** pen: Admin / Sign in (oW5vB). */
export default async function AdminSignInPage() {
  const user = await getCurrentUser();
  if (user?.role === "admin") redirect("/admin");
  const [t, settings] = await Promise.all([getMessages(adminMessages), getStoreSettings()]);
  const s = t.signIn;

  return (
    <main className="flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:h-dvh lg:min-h-[640px] lg:flex-row">
      <section className="relative flex min-h-[260px] w-full shrink-0 flex-col justify-between overflow-hidden rounded-m p-6 sm:p-8 lg:w-[640px]">
        <Image
          src="/images/site/admin-sign-in.png"
          alt=""
          fill
          priority
          quality={100}
          sizes="(min-width: 1024px) 640px, 100vw"
          className="object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-linear-to-b from-ink/0 from-40% to-ink/85" />
        <div className="relative flex items-center gap-3">
          <Image
            src="/images/site/logo-badge.png"
            alt={settings.storeName}
            width={72}
            height={72}
            quality={100}
            className="size-14 rounded-full sm:size-[72px]"
          />
          <span className="rounded-pill bg-highlight px-3 py-1.5 font-mono text-xs leading-[18px] font-semibold tracking-[1px] text-foreground">
            {s.tag}
          </span>
        </div>
        <div className="relative mt-16 flex w-full flex-col gap-3 lg:mt-0">
          <p className="font-display text-[32px] leading-[1.05] font-bold tracking-[-0.5px] text-white lg:text-[40px]">
            {s.quote}
          </p>
          <p className="text-base leading-6 text-white">{s.quoteSub(settings.storeName, settings.city)}</p>
        </div>
      </section>

      <div className="flex flex-1 flex-col items-center justify-center py-6 lg:py-0">
        <div className="flex w-full max-w-[440px] flex-col gap-5">
          <div className="flex flex-col gap-2 pb-2">
            <p className="font-mono text-xs leading-[18px] font-semibold tracking-[1px] text-primary">{s.eyebrow}</p>
            <h1 className="font-display text-[36px] leading-none font-bold tracking-[-1px] lg:text-[44px]">{s.title}</h1>
            <p className="text-base leading-6 text-muted-foreground">{s.sub}</p>
          </div>
          <AdminSignInForm helpEmail={settings.email} />
        </div>
      </div>
    </main>
  );
}
