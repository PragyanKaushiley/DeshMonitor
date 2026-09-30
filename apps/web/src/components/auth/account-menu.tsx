"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { openConsentBanner } from "@/lib/consent";
import { sessionEndsAt, type AuthUser } from "@/lib/auth";
import { AccountAvatarLarge } from "./account-avatar";

// What the drawer shows once you're signed in: who you are, how long this
// session lasts, and the two things you can do from here.

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function AccountMenu({
  user,
  sessionStartedAt,
  onLogOut,
  onPrivacyChoices,
}: {
  user: AuthUser;
  sessionStartedAt: string | null;
  onLogOut: () => void;
  onPrivacyChoices: () => void;
}) {
  const endsAt = sessionEndsAt(sessionStartedAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-center md:text-left">
        <AccountAvatarLarge user={user} />
        <div className="grid min-w-0">
          <span className="truncate text-sm text-foreground">{user.email}</span>
          <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
            {endsAt ? `SIGNED IN UNTIL ${formatDate(endsAt).toUpperCase()}` : "SIGNED IN"}
          </span>
        </div>
      </div>

      <ul className="grid list-none border-t border-border pt-1.5 pl-0">
        <li>
          <button
            type="button"
            onClick={() => {
              // Close first, then reopen the banner — otherwise the drawer
              // sits on top of it.
              onPrivacyChoices();
              openConsentBanner();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-2 text-left text-sm text-foreground transition-colors outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <ShieldCheck aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            Privacy choices
          </button>
        </li>
        <li className="my-1.5 border-t border-border" role="separator" />
        <li>
          <button
            type="button"
            onClick={onLogOut}
            className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-2 text-left font-mono text-[11px] tracking-[0.2em] text-foreground transition-colors outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <LogOut aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            LOG OUT
          </button>
        </li>
      </ul>
    </div>
  );
}
