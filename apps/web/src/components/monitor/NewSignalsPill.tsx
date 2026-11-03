"use client";

import { ArrowUp } from "lucide-react";

// Shown only when new signals arrived while the reader was further down the
// list — the list never moves under them without being asked.

export function NewSignalsPill({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-teal-500/40 bg-background/90 px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] text-teal-400 shadow-lg backdrop-blur-sm transition-colors outline-none hover:bg-teal-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2"
      >
        <ArrowUp aria-hidden className="size-3" />
        {count} NEW SIGNAL{count > 1 ? "S" : ""}
      </button>
    </div>
  );
}
