import { ArrowLink } from "@/components/ui/button";
import { Snapshot } from "@/components/ui/snapshot";

/**
 * pen: Card/Occasion (vmZj4) — photo, title, body and a Button/Link.
 * The photo is a flat, framed snapshot.
 */
export function OccasionCard({
  image,
  alt,
  title,
  body,
  href,
  linkLabel,
}: {
  image: string;
  alt: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <article className="flex min-w-0 flex-col items-start gap-4">
      <Snapshot
        src={image}
        alt={alt}
        sizes="(min-width: 1024px) 421px, 100vw"
        className="h-[240px] w-full lg:h-[320px]"
      />
      <h3 className="pt-1 font-display text-[24px] leading-[27px] font-medium text-foreground lg:text-[28px] lg:leading-[31px]">
        {title}
      </h3>
      <p className="text-pretty text-base leading-normal text-foreground">{body}</p>
      <ArrowLink href={href}>{linkLabel}</ArrowLink>
    </article>
  );
}
