import { extendTailwindMerge } from "tailwind-merge";

/**
 * Join class names and resolve Tailwind conflicts, so a class passed in from
 * outside (e.g. `hidden sm:inline-flex`) wins over a component's base class.
 * Extended with the project's own token names from globals.css.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["m", "pill"],
      font: ["display", "body"],
    },
  },
});

export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
