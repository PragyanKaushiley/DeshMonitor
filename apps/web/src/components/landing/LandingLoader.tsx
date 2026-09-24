"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useLandingAssetLoader } from "@/lib/landing/useLandingAssetLoader";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import { requestGlobeIntro, whenGlobeReady } from "@/lib/landing/globeReady";
import { Meteors } from "@/components/ui/meteors";
import { Desh } from "./Desh";

export type LandingState = "loading" | "ready" | "transitioning" | "active";

// Deliberate exception to "no artificial delay" (see assetLoader.ts): the
// meteor shower needs room to read before cutting away, even when assets
// are ready almost instantly. The loader stays up for at least this long,
// and longer if assets or the globe still aren't ready.
const MIN_DISPLAY_MS = 3000;

// Selector for the hero title in GlobeScene that the wordmark flies into.
export const HERO_BRAND_SELECTOR = "[data-hero-brand]";

function labelForAsset(currentAsset: string | undefined, assetsDone: boolean, globeReady: boolean) {
  if (assetsDone && !globeReady) return "BUILDING GLOBE";
  if (!assetsDone && currentAsset && currentAsset.includes("/globe/")) return "LOADING GLOBE DATA";
  if (!assetsDone && (!currentAsset || currentAsset === "fonts")) {
    return (
      <>
        INITIALIZING <Desh /> MONITOR
      </>
    );
  }
  return (
    <>
      CALIBRATING <Desh /> MONITOR
    </>
  );
}

// Share of the progress bar covered by fetched assets; the rest is the
// globe build, so the bar doesn't sit at 100% while the globe is built.
const ASSET_SHARE = 0.75;

export function LandingLoader({ onComplete }: { onComplete: () => void }) {
  const { progress, currentAsset, isComplete, failed } = useLandingAssetLoader();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [state, setState] = useState<LandingState>("loading");
  const [globeReady, setGlobeReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLSpanElement>(null);
  const completedRef = useRef(false);
  const mountedAtRef = useRef<number | null>(null);
  if (mountedAtRef.current === null) mountedAtRef.current = performance.now();

  // Scroll lock while the loader is up. Keyed on `active` because this
  // component stays mounted (rendering null) after it finishes, so an
  // unmount-only cleanup would never release the lock.
  const active = state === "active";
  useEffect(() => {
    if (active) return;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = previousOverflow;
    };
  }, [active]);

  // Minimum-display pacing for the bar: it may never run ahead of the 3s
  // minimum, so it reaches 100% as the exit begins instead of parking at
  // 100% while the minimum runs out. It still never runs ahead of real
  // loading either — readiness itself stays asset-driven.
  const [timeShare, setTimeShare] = useState(0);
  useEffect(() => {
    if (state !== "loading") return;
    const id = window.setInterval(() => {
      const elapsed = performance.now() - (mountedAtRef.current ?? performance.now());
      const share = Math.min(elapsed / MIN_DISPLAY_MS, 1);
      setTimeShare(share);
      if (share >= 1) window.clearInterval(id);
    }, 50);
    return () => window.clearInterval(id);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    void whenGlobeReady().then(() => {
      if (!cancelled) setGlobeReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isComplete || !globeReady || completedRef.current) return;
    completedRef.current = true;

    const finish = () => {
      setState("active");
      onComplete();
    };

    const beginExit = () => {
      setState("transitioning");
      requestGlobeIntro();

      const root = rootRef.current;
      const bg = bgRef.current;
      const meta = metaRef.current;
      const wordmark = wordmarkRef.current;
      const target = document.querySelector<HTMLElement>(HERO_BRAND_SELECTOR);

      if (prefersReducedMotion || !root || !bg || !meta || !wordmark || !target) {
        if (!root) return finish();
        gsap.to(root, { opacity: 0, duration: 0.3, onComplete: finish });
        return;
      }

      root.style.pointerEvents = "none";

      // FLIP: move/scale the loader wordmark onto the hero title's exact
      // rect, then swap to the real title at the same spot (see GlobeScene).
      // Both are styled identically, so a uniform scale reads as one object.
      const from = wordmark.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const scale = to.width / from.width;
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);

      gsap
        .timeline({ onComplete: finish })
        .to(meta, { opacity: 0, y: -8, duration: 0.3 }, 0)
        .to(bg, { opacity: 0, duration: 0.9, ease: "power1.inOut" }, 0.15)
        .to(wordmark, { x: dx, y: dy, scale, duration: 1.1, ease: "power3.inOut" }, 0.1);
    };

    const elapsed = performance.now() - (mountedAtRef.current ?? performance.now());
    const remaining = prefersReducedMotion ? 0 : Math.max(0, MIN_DISPLAY_MS - elapsed);
    const timeoutId = window.setTimeout(beginExit, remaining);
    return () => window.clearTimeout(timeoutId);
  }, [isComplete, globeReady, onComplete, prefersReducedMotion]);

  if (state === "active") return null;

  const realShare = progress * ASSET_SHARE + (globeReady ? 1 - ASSET_SHARE : 0);
  const shownShare = prefersReducedMotion || state !== "loading" ? realShare : Math.min(realShare, timeShare);
  const percent = Math.round(shownShare * 100);
  const hasCriticalFailure = failed.length > 0 && isComplete;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-busy={state === "loading"}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden text-foreground"
    >
      <div ref={bgRef} className="absolute inset-0 overflow-hidden bg-background">
        {!prefersReducedMotion && <Meteors number={28} />}
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <span ref={wordmarkRef} className="inline-block origin-center font-display text-3xl text-foreground will-change-transform sm:text-4xl">
          <Desh /> Monitor
        </span>
        <div ref={metaRef} className="flex flex-col items-center gap-6">
          <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground">
            {String(percent).padStart(2, "0")}%
          </span>
          <span className="font-mono text-[11px] tracking-[0.25em] text-muted-foreground/80">
            {hasCriticalFailure ? "SOME DATA FAILED TO LOAD" : labelForAsset(currentAsset, isComplete, globeReady)}
          </span>
          <div className="mt-6 h-px w-48 overflow-hidden bg-border sm:w-64">
            <div
              className="h-full bg-foreground transition-[width] duration-200 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
