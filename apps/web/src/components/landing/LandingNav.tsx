"use client";

import { useEffect, useState } from "react";
import { ThemeTogglerButton } from "@/components/animate-ui/components/buttons/theme-toggler";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { Desh } from "./Desh";

export function LandingNav({ sceneLabel }: { sceneLabel: string }) {
  // next-themes can't know the resolved theme during SSR, so the icon it
  // renders client-side legitimately differs from the server's guess —
  // render a stable placeholder until mounted to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 sm:px-10 sm:py-6">
      {/* Theme-aware scrim + text: the page beneath the nav is no longer
          guaranteed to be dark photography (the globe/India/data sections
          all use theme-reactive bg-background), so a hardcoded white/black
          treatment would go illegible in light mode — a backdrop blur reads
          against anything, in either theme. */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background/50 backdrop-blur-sm" />
      <ScrollProgress className="absolute top-auto bottom-0 h-0.5 from-teal-300 via-teal-500 to-teal-700" />
      <span className="whitespace-nowrap font-display text-sm tracking-[0.2em] text-foreground sm:text-base">
        <Desh /> MONITOR
      </span>
      <div className="flex min-w-0 items-center gap-3 sm:gap-6">
        <span className="truncate font-mono text-[10px] tracking-[0.15em] text-muted-foreground sm:text-xs sm:tracking-[0.2em]">
          {sceneLabel}
        </span>
        {mounted ? (
          <ThemeTogglerButton variant="ghost" size="sm" />
        ) : (
          <span className="size-9" aria-hidden />
        )}
      </div>
    </nav>
  );
}
