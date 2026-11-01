import Image from "next/image";
import Link from "next/link";
import { getMessages } from "@/i18n/server";
import { commonMessages } from "@/i18n/messages/common";
import { cn } from "@/lib/cn";
import { getStoreSettings } from "@/lib/settings";
import { Cutout } from "@/components/ui/snapshot";
import { NewsletterForm } from "./newsletter-form";

const linkClass =
  "w-fit font-display text-base leading-[1.3] sm:text-lg font-medium text-foreground-inverse transition-opacity hover:opacity-75";
const headingClass = "font-mono text-[13px] leading-normal font-semibold tracking-[1px] text-mint";

/** pen: Footer (Rrkv4), restaged by owner request: centred badge + newsletter on top, link columns below. */
export async function Footer() {
  const [t, settings] = await Promise.all([getMessages(commonMessages), getStoreSettings()]);
  const f = t.footer;
  const wa = `https://wa.me/${settings.phone.replace(/\D/g, "")}`;

  const columns = [
    {
      heading: f.shop,
      links: [
        { href: "/menu", label: f.menu },
        { href: "/menu?category=soft-cookies", label: f.cookies },
        { href: "/menu?category=brownies", label: f.brownies },
        { href: "/menu?category=tiramisu", label: f.tiramisu },
      ],
    },
    {
      heading: f.visit,
      links: [
        { href: "/our-story", label: f.story },
        { href: "/location", label: f.location },
        { href: "/faq", label: f.faq },
        { href: "/careers", label: f.careers },
      ],
    },
    {
      heading: f.help,
      links: [
        { href: "/shipping-policy", label: f.shipping },
        { href: "/returns-refunds", label: f.returns },
        { href: "/privacy-policy", label: f.privacy },
        { href: "/account", label: f.account },
      ],
    },
  ];

  return (
    <footer className="w-full bg-background px-3 pb-3 md:px-6 md:pb-6">
      <div className="relative flex w-full flex-col gap-12 rounded-m bg-surface-inverse [--focus-ring:var(--white)] px-6 pt-12 pb-8 md:px-16 md:pt-16 lg:gap-14">
        {/* Decorative cookies peeking over the top edge, clear of the centred newsletter (lg+ only). */}
        <Cutout name="white-chocolate-almond" width={150} className="-top-10 left-8 hidden lg:block" />
        <Cutout name="double-chocolate" width={124} className="-top-8 right-10 hidden lg:block" />

        {/* Newsletter, centred under the badge */}
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-4 text-center">
          <Image
            src="/images/site/logo-badge.png"
            alt="Droolbites"
            width={112}
            height={112}
            quality={100}
            className="size-24 rounded-full object-cover lg:size-28"
          />
          <p className="pt-2 font-display type-section font-bold text-foreground-inverse">
            {f.newsTitle}
          </p>
          <p className="text-base leading-normal text-balance text-mint">{f.newsSub}</p>
          <div className="w-full max-w-[440px] pt-2 text-left">
            <NewsletterForm />
          </div>
          <div className="flex gap-3 pt-1">
            <SocialLink href="https://www.instagram.com/droolbites" label="Instagram">
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </SocialLink>
            <SocialLink href="https://www.tiktok.com/@droolbites" label="TikTok">
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </SocialLink>
            <SocialLink href={wa} label="WhatsApp">
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </SocialLink>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-x-6 gap-y-10 pt-12 shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] sm:grid-cols-3 lg:flex lg:gap-10">
          <div className="col-span-2 flex flex-col gap-4 sm:col-span-3 lg:w-[360px] lg:shrink-0">
            <p className="max-w-[360px] text-base leading-normal text-foreground-inverse">{f.tagline}</p>
            {/* pen rounds text boxes up to whole pixels: 15px × 1.5 → 23px. */}
            <div className="flex flex-col gap-1 text-[15px] leading-[23px] text-mint">
              {/* Hit-slop toward 44px; the two lines split the 4px gap between them so the areas never overlap. */}
              <a
                href={`mailto:${settings.email}`}
                className="relative w-fit after:absolute after:-inset-x-2 after:-top-[11px] after:-bottom-0.5 after:content-[''] hover:text-white"
              >
                {settings.email}
              </a>
              <a
                href={`tel:${settings.phone.replace(/\s/g, "")}`}
                className="relative w-fit after:absolute after:-inset-x-2 after:-top-0.5 after:-bottom-[11px] after:content-[''] hover:text-white"
              >
                {settings.phone}
              </a>
            </div>
          </div>

          {/* Below sm the last column spans both tracks and lays its links in two, so no column sits alone. */}
          {columns.map((col, i) => (
            <nav
              key={col.heading}
              aria-label={col.heading}
              className={cn("flex flex-col gap-3.5 lg:flex-1", i === columns.length - 1 && "col-span-2 sm:col-span-1")}
            >
              <p className={headingClass}>{col.heading}</p>
              <div
                className={cn(
                  "flex flex-col gap-3.5",
                  i === columns.length - 1 && "max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-6",
                )}
              >
                {col.links.map((link) => (
                  <Link key={link.href} href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          ))}
        </div>

        <div className="flex w-full flex-col gap-2 pt-6 text-[13px] leading-[20px] text-mint shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] md:flex-row md:justify-between">
          <p>{f.rights}</p>
          <p>{settings.address}</p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="relative flex size-10 items-center justify-center rounded-pill text-foreground-inverse after:absolute after:-inset-0.5 after:content-[''] inset-ring-1 inset-ring-foreground-inverse transition-colors hover:bg-white/15"
    >
      {children}
    </a>
  );
}
