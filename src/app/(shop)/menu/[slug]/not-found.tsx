import { ButtonLink } from "@/components/ui/button";
import { getMessages } from "@/i18n/server";
import { productMessages } from "@/i18n/messages/product";

/** Unknown or unavailable product slug. */
export default async function ProductNotFound() {
  const t = await getMessages(productMessages);
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-4 px-4 py-24 sm:px-8 lg:px-16 lg:py-32">
      <h1 className="font-display text-[40px] leading-[42px] font-bold tracking-[-1px] text-foreground lg:text-[56px] lg:leading-[57px]">
        {t.notFoundTitle}
      </h1>
      <p className="max-w-[560px] text-lg leading-[27px] text-muted-foreground">{t.notFoundBody}</p>
      <ButtonLink href="/menu" className="mt-2">
        {t.notFoundCta}
      </ButtonLink>
    </div>
  );
}
