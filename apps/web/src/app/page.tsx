"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { LandingLoader } from "@/components/landing/LandingLoader";
import { CinematicJourney, type LandingPhase } from "@/components/landing/CinematicJourney";

export default function Home() {
  const [phase, setPhase] = useState<LandingPhase>("loading");
  const onComplete = useCallback(() => setPhase("ready"), []);

  useLayoutEffect(() => {
    // Scroll-driven experience: always restart from the top on reload,
    // rather than restoring a mid-sequence scroll position.
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    // Scene height (--stage-h) follows the window's *width* changes only.
    // Height-only changes — docking devtools, a mobile address bar
    // collapsing — would otherwise re-center the hero and move the globe.
    const root = document.documentElement;
    let lastWidth = window.innerWidth;
    root.style.setProperty("--stage-h", `${window.innerHeight}px`);
    function onResize() {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      root.style.setProperty("--stage-h", `${window.innerHeight}px`);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <main className="relative">
      {/* Mounted immediately (not after the loader) so the globe is already
          built beneath the loader and the wordmark has a real target. */}
      <CinematicJourney phase={phase} />
      <LandingLoader onComplete={onComplete} />
    </main>
  );
}
