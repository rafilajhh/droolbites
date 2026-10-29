/** pen: the white account cards (W2AkM, biVPB, IzCPT): 32px padding, 24px gap, subtle stroke. */
export function AccountCard({
  id,
  title,
  sub,
  children,
}: {
  id: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex w-full scroll-mt-[88px] flex-col gap-6 rounded-m bg-white p-5 inset-ring-1 inset-ring-border-subtle sm:p-8"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="font-display text-[28px] leading-[31px] font-bold text-foreground">
          {title}
        </h2>
        <p className="text-[15px] leading-[23px] text-muted-foreground">{sub}</p>
      </div>
      {children}
    </section>
  );
}
