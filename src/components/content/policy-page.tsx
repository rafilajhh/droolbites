import { ButtonLink } from "@/components/ui/button";
import { policyMessages, type PolicyKey } from "@/i18n/messages/pages/policies";
import { getMessages } from "@/i18n/server";
import { getStoreSettings } from "@/lib/settings";
import { Eyebrow } from "./eyebrow";
import { PolicyToc } from "./policy-toc";

export async function policyMetadata(key: PolicyKey) {
  const t = await getMessages(policyMessages);
  return { title: t[key].title, description: t[key].metaDescription };
}

/** Shared layout of the three policy frames (MInKs, T4tsh, C9zhg6). */
export async function PolicyPage({ policy }: { policy: PolicyKey }) {
  const [messages, settings] = await Promise.all([getMessages(policyMessages), getStoreSettings()]);
  const t = messages[policy];
  const contact = { email: settings.email, phone: settings.phone };

  return (
    <>
      <header className="flex w-full flex-col gap-4 px-4 pt-6 pb-10 shadow-[inset_0_-1px_0_var(--border-subtle)] sm:px-8 lg:px-16 lg:pt-14 lg:pb-12">
        <Eyebrow>{messages.eyebrow}</Eyebrow>
        <h1 className="max-w-[900px] font-display text-[44px] leading-[1.03] font-bold tracking-[-1px] text-foreground sm:text-[56px] lg:text-[72px] lg:leading-[73px] lg:tracking-[-2px]">
          {t.title}
        </h1>
        <p className="text-[17px] leading-[1.53] text-muted-foreground lg:text-[19px] lg:leading-[29px]">{t.sub}</p>
      </header>

      <div className="flex w-full flex-col gap-10 px-4 pt-10 pb-16 sm:px-8 lg:flex-row lg:gap-24 lg:px-16 lg:pt-14 lg:pb-28">
        <PolicyToc heading={messages.contents} items={t.sections.map(({ id, title }) => ({ id, title }))} />

        <div className="flex min-w-0 flex-1 flex-col gap-10">
          {t.sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="flex scroll-mt-8 flex-col gap-3 pb-10 shadow-[inset_0_-1px_0_var(--border-subtle)]"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-card text-[13px] leading-none font-bold text-foreground">
                  {i + 1}
                </span>
                <h2
                  id={`${section.id}-title`}
                  className="font-display text-2xl leading-[1.1] font-bold text-foreground lg:text-[30px] lg:leading-[33px]"
                >
                  {section.title}
                </h2>
              </div>
              <p className="max-w-[720px] text-[17px] leading-[28px] text-muted-foreground">{section.body(contact)}</p>
            </section>
          ))}
          {"history" in t ? (
            <ButtonLink href="/account" className="w-fit">
              {t.history}
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </>
  );
}
