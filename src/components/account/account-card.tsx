/** pen: the white account cards (W2AkM, biVPB, IzCPT): 32px padding, 24px gap, subtle stroke. */
export function AccountCard({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex w-full scroll-mt-[88px] flex-col gap-6 rounded-m bg-white p-5 inset-ring-1 inset-ring-border-subtle sm:p-8"
    >
      <h2
        id={`${id}-title`}
        className="font-display text-[24px] leading-[28px] font-bold tracking-[-0.5px] text-foreground lg:text-[28px] lg:leading-[31px]"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
