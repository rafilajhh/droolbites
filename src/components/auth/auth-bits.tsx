import Link from "next/link";

/** pen: Head (eyebrow, page title, sub) with its 8px bottom padding. */
export function AuthHead({ eyebrow, title, sub, titleId }: { eyebrow: string; title: string; sub: string; titleId?: string }) {
  return (
    <div className="flex w-full flex-col gap-2.5 pb-2">
      <p className="font-mono text-xs leading-normal font-semibold tracking-[1px] text-primary">{eyebrow}</p>
      <h1
        id={titleId}
        tabIndex={titleId ? -1 : undefined}
        className="font-display type-page font-bold text-foreground outline-hidden"
      >
        {title}
      </h1>
      <p className="text-base leading-normal text-balance text-muted-foreground">{sub}</p>
    </div>
  );
}

/** pen: Switch row ("New to Droolbites? Create an account"). */
export function AuthSwitch({ text, linkLabel, href }: { text?: string; linkLabel: string; href: string }) {
  return (
    <p className="flex w-full flex-wrap justify-center gap-x-1.5 pt-2 text-[15px] leading-[23px]">
      {text ? <span className="text-muted-foreground">{text}</span> : null}
      <Link href={href} className="relative font-bold text-foreground underline-offset-4 after:absolute after:-inset-x-2 after:-inset-y-2.5 after:content-[''] hover:underline">
        {linkLabel}
      </Link>
    </p>
  );
}
