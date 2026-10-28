import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** pen: Button/Primary (EgLXp) and Button/Secondary (Qc8P6). */
export type ButtonVariant = "primary" | "secondary" | "inverse";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm px-7 py-4 font-display text-[15px] font-semibold leading-[1.2] tracking-[0.5px] transition-[color,background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary: "text-foreground inset-ring-[1.5px] inset-ring-border hover:bg-card",
  // White button used on the green hero.
  inverse: "bg-white text-foreground hover:bg-oat",
};

export function buttonClasses(variant: ButtonVariant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & { variant?: ButtonVariant };

export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}

/** pen: Button/Link (d7D5N) — text with an underline stroke and an arrow. */
export function ArrowLink({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "group relative inline-flex items-center gap-1.5 pb-1 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] font-display text-[15px] font-semibold leading-[1.2] text-foreground shadow-[inset_0_-1.25px_0_var(--border)]",
        className,
      )}
      {...props}
    >
      {children}
      <ArrowRight
        className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        aria-hidden
      />
    </Link>
  );
}
