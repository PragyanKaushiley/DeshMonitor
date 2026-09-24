"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OPEN_CONSENT_EVENT, getConsent, setConsent, type ConsentChoice } from "@/lib/consent";
import { recordVisit } from "@/lib/visits";

// Asks for consent (once, until the notice version changes) and records the
// visit only after it's given. `enabled` lets the landing page wait until its
// loader has finished, so the banner never covers the intro.
export function VisitTracker({ enabled = true }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const choice = getConsent();
    if (choice === "accepted") recordVisit();
    else if (choice === null) setOpen(true);
  }, [enabled]);

  function choose(choice: ConsentChoice) {
    setConsent(choice);
    setOpen(false);
    if (choice === "accepted") recordVisit();
  }

  if (!enabled || !open) return null;

  return (
    <section
      aria-labelledby="consent-title"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-xl border border-border bg-background/95 p-4 text-left shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-500 sm:inset-x-auto sm:bottom-6 sm:left-6"
    >
      <h2 id="consent-title" className="font-mono text-[11px] tracking-[0.2em] text-foreground">
        YOUR PRIVACY
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        With your permission, we record your visit — including your IP address, approximate location and device — to
        understand who uses this site.{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy policy
        </Link>
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => choose("declined")}
          className="min-h-9 rounded-md border border-border px-4 font-mono text-xs tracking-[0.15em] text-foreground transition-colors hover:bg-muted"
        >
          DECLINE
        </button>
        <button
          type="button"
          onClick={() => choose("accepted")}
          className="min-h-9 rounded-md border border-foreground px-4 font-mono text-xs tracking-[0.15em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          ACCEPT
        </button>
      </div>
    </section>
  );
}
