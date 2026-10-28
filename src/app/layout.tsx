import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Manrope } from "next/font/google";
import { LocaleProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import "./globals.css";

// Same families and weights the pen file uses (see design/html exports).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: "variable",
  // The opsz axis is needed for the "opsz" 96 setting in globals.css.
  axes: ["opsz"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Droolbites — Soft cookies, fudgy brownies & tiramisu in Surabaya",
    template: "%s · Droolbites",
  },
  description:
    "Thick, soft-centered cookies, fudgy brownies and creamy tiramisu — made in small batches in Surabaya for delivery or store pickup.",
  icons: { icon: "/images/site/logo-badge.png" },
};

export const viewport: Viewport = {
  themeColor: "#FBF6EC",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${bricolage.variable} ${manrope.variable} ${plexMono.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-background font-body text-foreground">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
