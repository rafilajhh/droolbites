import { MapPin, PackageCheck, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";

const perkStyle = [
  { icon: MapPin, fill: "bg-tint-mustard" },
  { icon: PackageCheck, fill: "bg-mint" },
  { icon: RotateCcw, fill: "bg-tint-lavender" },
];

/** What an account adds, shown between the sign-up head and the form: one oat strip, three icon perks. */
export function SignUpPerks({ label, perks }: { label: string; perks: readonly string[] }) {
  return (
    <ul aria-label={label} className="grid w-full grid-cols-3 gap-2 rounded-m bg-card p-3 sm:gap-3 sm:p-4">
      {perks.map((perk, i) => {
        const Icon = perkStyle[i].icon;
        return (
          <li key={perk} className="flex flex-col items-start gap-2.5 p-1">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-pill", perkStyle[i].fill)}>
              <Icon className="size-5 text-foreground" aria-hidden />
            </span>
            <span className="text-[15px] leading-[20px] font-semibold text-pretty text-foreground">{perk}</span>
          </li>
        );
      })}
    </ul>
  );
}
