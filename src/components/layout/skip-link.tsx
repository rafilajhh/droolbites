/** Visually hidden until focused; jumps past the header to <main id="main">. */
export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#main"
      className="sr-only rounded-sm bg-white px-4 py-3 text-sm leading-[21px] font-bold text-foreground shadow-[0_12px_32px_color-mix(in_srgb,var(--ink)_15%,transparent)] focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
    >
      {label}
    </a>
  );
}
