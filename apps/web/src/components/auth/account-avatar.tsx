"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth";

// The nav's account button: 32px and round, the same hit area as the theme
// toggle beside it. Signed out it's a dashed outline — nobody's here yet;
// signed in it's the email's initial inside a teal ring, the same accent the
// bento cards and the scroll bar use.

export function AccountAvatar({
  user,
  expanded,
  onClick,
  ref,
}: {
  user: AuthUser | null;
  expanded: boolean;
  onClick: () => void;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={user ? `Account: ${user.email}` : "Log in or sign up"}
      className={cn(
        "grid size-8 place-items-center rounded-full transition-colors outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-teal-400",
        user
          ? "bg-card font-display text-[15px] leading-none text-foreground ring-1 ring-teal-700 transition-shadow hover:ring-4 hover:ring-teal-700/25 dark:ring-teal-400 dark:hover:ring-teal-400/25"
          : cn(
              "border border-dashed border-foreground/35 text-muted-foreground",
              "hover:border-foreground/60 hover:text-foreground",
              expanded && "border-solid border-foreground text-foreground",
            ),
      )}
    >
      {user ? (
        <span aria-hidden className="-translate-y-px">
          {user.email[0]?.toUpperCase()}
        </span>
      ) : (
        <User aria-hidden className="size-4" />
      )}
    </button>
  );
}

// The same mark, larger, at the top of the signed-in menu.
export function AccountAvatarLarge({ user }: { user: AuthUser }) {
  return (
    <span
      aria-hidden
      className="grid size-14 shrink-0 place-items-center rounded-full bg-card font-display text-2xl leading-none text-foreground ring-1 ring-teal-700 dark:ring-teal-400"
    >
      {user.email[0]?.toUpperCase()}
    </span>
  );
}
