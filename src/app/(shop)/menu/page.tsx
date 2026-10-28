import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuBrowser } from "@/components/shop/menu-browser";
import { toShopCategories } from "@/components/shop/shop-product";
import { getLocale, getMessages } from "@/i18n/server";
import { menuMessages } from "@/i18n/messages/menu";
import { getMenu } from "@/lib/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(menuMessages);
  return { title: t.metaTitle, description: t.metaDescription };
}

/** pen: Our Menu (uQ4f5). Search and category filters live in the URL (?q=, ?category=). */
export default async function MenuPage() {
  const [t, locale, menu] = await Promise.all([getMessages(menuMessages), getLocale(), getMenu()]);
  const categories = toShopCategories(menu, locale);
  const total = categories.reduce((sum, c) => sum + c.products.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col">
      <div className="flex w-full flex-col gap-4 px-4 pt-8 pb-8 sm:px-8 lg:flex-row lg:items-end lg:gap-12 lg:px-16 lg:pt-14 lg:pb-10">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:gap-4">
          <p className="font-mono text-[13px] leading-[20px] font-semibold tracking-[1px] text-primary">{t.eyebrow}</p>
          <h1 className="font-display text-[48px] leading-[48px] font-bold tracking-[-1.5px] text-foreground sm:text-[64px] sm:leading-[64px] lg:text-[80px] lg:leading-[80px] lg:tracking-[-2px]">
            {t.title}
          </h1>
        </div>
        <p className="max-w-[420px] text-base leading-[24px] text-muted-foreground lg:w-[420px] lg:text-lg lg:leading-[27px]">
          {t.sub(total)}
        </p>
      </div>
      <Suspense>
        <MenuBrowser categories={categories} />
      </Suspense>
    </div>
  );
}
