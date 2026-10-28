import { Children, cloneElement, isValidElement } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * pen: Form Field (t2s6N). Label 14/600, input 16px with 14×16 padding,
 * white fill, radius-s and a 1.25px #5B665080 inside stroke.
 */
export const inputClasses =
  "w-full rounded-sm bg-white px-4 py-3.5 text-base leading-normal text-foreground placeholder:text-muted-foreground inset-ring-[1.25px] inset-ring-border-input outline-hidden transition-shadow focus-visible:inset-ring-2 focus-visible:inset-ring-primary aria-[invalid=true]:inset-ring-error disabled:bg-card";

export function Field({
  label,
  htmlFor,
  helper,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  helper?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const describedBy = error ? `${htmlFor}-error` : helper ? `${htmlFor}-helper` : undefined;
  // Link the control to its helper/error text unless the caller already did.
  const control = Children.map(children, (child) =>
    describedBy &&
    isValidElement<{ id?: string; "aria-describedby"?: string }>(child) &&
    child.props.id === htmlFor &&
    !child.props["aria-describedby"]
      ? cloneElement(child, { "aria-describedby": describedBy })
      : child,
  );
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold leading-[18px] text-foreground">
        {label}
      </label>
      {control}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[13px] leading-[20px] text-error" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p id={`${htmlFor}-helper`} className="text-[13px] leading-[20px] text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClasses, "resize-y", className)} {...props} />;
}

/** Native select styled like the pen field with the trailing chevron. */
export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select className={cn(inputClasses, "appearance-none pr-11", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2 text-foreground"
        aria-hidden
      />
    </div>
  );
}
