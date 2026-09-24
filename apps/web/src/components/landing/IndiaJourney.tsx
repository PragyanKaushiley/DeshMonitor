"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { gsap } from "@/lib/landing/gsapSetup";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { ShineBorder } from "@/components/ui/shine-border";
import { Desh } from "./Desh";

// Draft copy — broad categories देश Monitor is built around, not a claim
// that all four are live today (only news + weather ingestion exist yet).
const CATEGORIES = [
  { title: "NEWS & MEDIA", description: "25+ verified sources, tracked as they publish." },
  { title: "WEATHER & CLIMATE", description: "Forecasts, air quality, and seasonal outlooks." },
  { title: "MARKETS & ECONOMY", description: "Signals from trade, finance, and industry." },
  { title: "GOVERNMENT & POLICY", description: "Notifications and institutional activity." },
];

const SHINE_COLORS = ["#2dd4bf", "#0f766e", "#5eead4"];
const MOBILE_BREAKPOINT = 768;

// Where India's centre lands in the data phase, as a fraction of the
// section: desktop pushes it to the right edge so roughly half stays in
// frame; mobile keeps it centred, dimmed behind the grid.
const DESKTOP_TARGET = { x: 0.86, y: 0.5, scale: 2.6, opacity: 0.9 };
const MOBILE_TARGET = { x: 0.5, y: 0.5, scale: 1.6, opacity: 0.25 };

export function IndiaJourney({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;

    const section = sectionRef.current;
    const reveal = revealRef.current;
    const map = mapRef.current;
    const copy = copyRef.current;
    const hint = hintRef.current;
    const grid = gridRef.current;
    if (!section || !reveal || !map || !copy || !hint || !grid) return;

    // Layout offsets (not getBoundingClientRect) so measurements ignore the
    // transforms this timeline itself applies when it re-measures on refresh.
    function target() {
      const t = section!.clientWidth < MOBILE_BREAKPOINT ? MOBILE_TARGET : DESKTOP_TARGET;
      const cx = reveal!.offsetLeft + map!.offsetLeft + map!.offsetWidth / 2;
      const cy = reveal!.offsetTop + map!.offsetTop + map!.offsetHeight / 2;
      return {
        x: section!.clientWidth * t.x - cx,
        y: section!.clientHeight * t.y - cy,
        scale: t.scale,
        opacity: t.opacity,
      };
    }

    const ctx = gsap.context(() => {
      gsap.set(map, { opacity: 0, scale: 1.08 });
      gsap.set([...copy.children, hint], { opacity: 0, y: 16 });
      gsap.set(grid.children, { opacity: 0, y: 16 });

      // One timeline owns every property here — the hint used to be driven
      // by two timelines at once, and the entry one could win after the pin
      // ended, leaving "See what we're watching" visible at the end.
      // The section pins at the exact moment the globe (which sits on top
      // with pinSpacing off) is mid-fade, so the reveal plays as a crossfade.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${section.offsetHeight * 1.3}`,
            // Locked 1:1 to Lenis' already-smoothed scroll. A scrub lag
            // here trailed the globe's own (unlagged) crossfade, so scrolling
            // up held on India and then snapped through to the globe.
            scrub: true,
            pin: true,
            invalidateOnRefresh: true,
          },
        })
        .to(map, { opacity: 0.9, scale: 1, ease: "power1.out", duration: 0.5 }, 0)
        .to(copy.children, { opacity: 1, y: 0, stagger: 0.05, duration: 0.35 }, 0.1)
        .to(hint, { opacity: 1, y: 0, duration: 0.3 }, 0.45)
        .to({}, { duration: 0.3 })
        .set(copy, { pointerEvents: "none" })
        .to([copy, hint], { opacity: 0, y: -12, duration: 0.5 })
        .to(
          map,
          {
            x: () => target().x,
            y: () => target().y,
            scale: () => target().scale,
            opacity: () => target().opacity,
            ease: "power2.inOut",
            duration: 1.2,
          },
          "<",
        )
        .to(grid.children, { opacity: 1, y: 0, stagger: 0.1, duration: 0.5 }, "-=0.6")
        .to({}, { duration: 0.4 });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  const rm = reducedMotion;

  return (
    <section
      ref={sectionRef}
      className={
        rm
          ? "relative flex min-h-screen w-full flex-col items-center justify-center gap-12 bg-background px-6 py-24"
          : "relative z-0 h-[var(--stage-h,100svh)] w-full overflow-hidden bg-background"
      }
    >
      <div
        ref={revealRef}
        className={`flex flex-col items-center justify-center gap-5 px-6 pb-12 text-center ${rm ? "" : "absolute inset-0"}`}
      >
        {/* Width-based size: vh sizing made both silhouettes resize whenever
            the window height changed (e.g. docking devtools). */}
        <div
          ref={mapRef}
          className="pointer-events-none relative size-[min(76vw,320px)] opacity-90 dark:invert md:size-[clamp(220px,20vw,300px)]"
        >
          {/* India's southern tip sits 36.2% across this square box (the
              outline SVG is letterboxed and the tip is west of centre);
              shifting 13.8% puts it directly above the "D" of INDIA. */}
          <div className="absolute inset-0 translate-x-[13.8%]">
            <Image src="/landing/india/india-outline.svg" alt="Outline map of India" fill className="object-contain" />
          </div>
        </div>

        <div ref={copyRef} className="flex flex-col items-center gap-2">
          <h2 className="font-display text-4xl text-foreground sm:text-5xl">INDIA</h2>
          <p className="font-display text-xl text-muted-foreground sm:text-2xl">is constantly changing.</p>
          <p className="max-w-md font-display text-base text-muted-foreground sm:text-lg">
            Real-time signals from news, weather, and beyond — collected, verified, and made visible.
          </p>
          <p className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
            <Desh /> MONITOR
          </p>
          <p className="font-display text-lg text-muted-foreground sm:text-xl">See what&apos;s happening.</p>
          <Link
            href="/monitor?utm_source=deshmonitor&utm_medium=landing&utm_campaign=enter_monitor&utm_content=india_reveal_cta"
            className="mt-3 inline-flex items-center gap-2 border border-foreground/30 px-6 py-3 font-mono text-xs tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            ENTER <Desh /> MONITOR
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      {!rm && (
        <div
          ref={hintRef}
          className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-1 text-muted-foreground"
        >
          <span className="font-mono text-[11px] tracking-[0.3em]">SEE WHAT WE&apos;RE WATCHING</span>
          <ChevronDown className="size-4 animate-bounce [animation-duration:2s]" aria-hidden />
        </div>
      )}

      <div
        className={
          rm
            ? "flex w-full justify-center"
            : "pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 md:right-auto md:w-[66%] md:px-10 xl:w-[62%]"
        }
      >
        <div ref={gridRef} className="grid w-full max-w-sm grid-cols-2 gap-3 md:max-w-2xl md:gap-5">
          {CATEGORIES.map((category) => (
            <Card
              key={category.title}
              className="relative bg-card/80 backdrop-blur-sm [--card-spacing:--spacing(3)] md:[--card-spacing:--spacing(6)]"
            >
              <ShineBorder shineColor={SHINE_COLORS} />
              <CardContent>
                <h3 data-slot="card-title" className="font-mono text-[10px] leading-snug font-medium tracking-[0.2em] md:text-sm">
                  {category.title}
                </h3>
                <CardDescription className="mt-2 text-xs md:text-base">{category.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
