"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { useCallback, useEffect, useState } from "react";
import { gsap } from "@/lib/landing/gsapSetup";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import { LandingNav } from "./LandingNav";
import { IndiaJourney } from "./IndiaJourney";
import { SupportProject } from "./SupportProject";
// A plain static import, not next/dynamic(ssr:false) — that combination
// reproducibly crashed React's reconciler ("insertBefore: not a child of
// this node"). GlobeScene stays SSR-safe on its own: `three`/`three-globe`
// (which touch `window` at module scope) are loaded via dynamic import()
// inside its effect, not at module top-level — that's what actually needs
// to be kept off the server, not the component itself.
import { GlobeScene } from "./scenes/GlobeScene";

// Drives Lenis from GSAP's own ticker (instead of Lenis's internal rAF loop)
// so the two never run competing animation loops, per the "no scroll
// conflicts" requirement — the standard GSAP+Lenis integration pattern.
function LenisGsapBridge() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    const instance = lenis;

    function raf(time: number) {
      instance.raf(time * 1000);
    }
    // GSAP's default lag smoothing is kept on purpose: with it off, a single
    // long frame (e.g. React committing at the loader handoff) made
    // time-based tweens like the wordmark flight visibly jump.
    gsap.ticker.add(raf);

    return () => {
      gsap.ticker.remove(raf);
    };
  }, [lenis]);

  return null;
}

export type LandingPhase = "loading" | "ready";

export function CinematicJourney({ phase }: { phase: LandingPhase }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [sceneLabel, setSceneLabel] = useState("ORBITING");

  const onGlobeStatus = useCallback((status: string) => setSceneLabel(status), []);

  const content = (
    <>
      <LandingNav sceneLabel={sceneLabel} />
      <GlobeScene reducedMotion={prefersReducedMotion} phase={phase} onStatusChange={onGlobeStatus} />
      <IndiaJourney reducedMotion={prefersReducedMotion} />
      <SupportProject />
    </>
  );

  if (prefersReducedMotion) {
    return content;
  }

  return (
    <ReactLenis root options={{ autoRaf: false }}>
      <LenisGsapBridge />
      {content}
    </ReactLenis>
  );
}
