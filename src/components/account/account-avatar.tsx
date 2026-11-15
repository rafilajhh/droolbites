"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0][0], words[words.length - 1][0]] : [words[0]?.[0] ?? "?"];
  return letters.join("").toUpperCase();
}

/**
 * The account's round avatar: the Google profile photo when the account has one, else the initials on
 * mustard. A photo that fails to load (removed at Google, offline) falls back to the initials.
 * Decorative: the name is always written next to it.
 */
export function AccountAvatar({ name, photo, size, className }: { name: string; photo: string | null; size: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  // Google sizes the photo in the URL ("=s96-c"); ask for one sharp on 2x screens.
  const src = photo && !failed ? photo.replace(/=s\d+(-c)?$/, "=s256-c") : null;
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-pill bg-highlight font-display leading-none font-bold text-foreground",
        className,
      )}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} quality={100} className="object-cover" onError={() => setFailed(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
