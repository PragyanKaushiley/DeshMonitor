"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ChartCandlestick, ChevronDown, CloudSunRain, Landmark, MapPinned, Newspaper } from "lucide-react";
import { gsap } from "@/lib/landing/gsapSetup";
import { useScrolledPast } from "@/lib/landing/useScrolledPast";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { ShimmerLink } from "@/components/ui/shimmer-button";
import { ShineBorder } from "@/components/ui/shine-border";
import { GovernmentArt, MarketsArt, NewsArt, WeatherArt } from "./CategoryArt";
import { Desh } from "./Desh";

// Draft copy — broad categories देश Monitor is built around, not a claim
// that all four are live today (only news + weather ingestion exist yet).
// Spans make a bento around the tall "All of India" tile (placed second,
// see the grid below). Desktop, 3 columns: News + India / Weather, Markets
// beside India / Government across. Mobile, 2 columns: News / India beside
// Weather then Markets / Government.
const CATEGORIES = [
  {
    title: "NEWS & MEDIA",
    description: "25+ verified sources, tracked as they publish.",
    Icon: Newspaper,
    Art: NewsArt,
    span: "col-span-2",
  },
  {
    title: "WEATHER & CLIMATE",
    description: "Forecasts, air quality, and seasonal outlooks.",
    Icon: CloudSunRain,
    Art: WeatherArt,
    span: "col-span-1",
  },
  {
    title: "MARKETS & ECONOMY",
    description: "Signals from trade, finance, and industry.",
    Icon: ChartCandlestick,
    Art: MarketsArt,
    span: "col-span-1",
  },
  {
    title: "GOVERNMENT & POLICY",
    description: "Notifications and institutional activity.",
    Icon: Landmark,
    Art: GovernmentArt,
    span: "col-span-2",
  },
];

const SHINE_COLORS = ["#2dd4bf", "#0f766e", "#5eead4"];

// The outline is drawn this far right of its box so its tip sits over the
// "D" of INDIA (see the map markup); undone when centring it in the tile.
const MAP_SHIFT = 0.138;

export function IndiaJourney({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaTileRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const indiaSlotRef = useRef<HTMLDivElement>(null);
  const hintHidden = useScrolledPast(revealRef, reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;

    const section = sectionRef.current;
    const reveal = revealRef.current;
    const map = mapRef.current;
    const copy = copyRef.current;
    const cta = ctaRef.current;
    const ctaTile = ctaTileRef.current;
    const hint = hintRef.current;
    const grid = gridRef.current;
    const gridWrap = gridWrapRef.current;
    const indiaSlot = indiaSlotRef.current;
    if (!section || !reveal || !map || !copy || !cta || !ctaTile || !hint || !grid || !gridWrap || !indiaSlot) return;

    // Layout offsets (not getBoundingClientRect) so measurements ignore the
    // transforms this timeline itself applies when it re-measures on refresh.
    function target() {
      const cx = reveal!.offsetLeft + map!.offsetLeft + map!.offsetWidth / 2;
      const cy = reveal!.offsetTop + map!.offsetTop + map!.offsetHeight / 2;
      // Into the India tile's image area: tile offsets are relative to the
      // grid wrapper (the grid itself isn't positioned), the slot's to the tile.
      const slot = indiaSlot!;
      const tile = slot.offsetParent as HTMLElement;
      const size = map!.offsetWidth;
      const scale = (Math.min(slot.offsetWidth, slot.offsetHeight) * 1.1) / size;
      const sx = gridWrap!.offsetLeft + tile.offsetLeft + slot.offsetLeft + slot.offsetWidth / 2;
      const sy = gridWrap!.offsetTop + tile.offsetTop + slot.offsetTop + slot.offsetHeight / 2;
      return { x: sx - cx - MAP_SHIFT * size * scale, y: sy - cy, scale, opacity: 0.9 };
    }

    // Desktop: the button glides into the empty tile beside Government &
    // Policy. Phones hide that tile, so it simply fades with the copy.
    function ctaTarget() {
      if (section!.clientWidth < 768) return { x: 0, y: -12, opacity: 0 };
      const gx = gridWrap!.offsetLeft + ctaTile!.offsetLeft + ctaTile!.offsetWidth / 2;
      const gy = gridWrap!.offsetTop + ctaTile!.offsetTop + ctaTile!.offsetHeight / 2 + 12;
      return {
        x: gx - (cta!.offsetLeft + cta!.offsetWidth / 2),
        y: gy - (cta!.offsetTop + cta!.offsetHeight / 2),
        opacity: 1,
      };
    }

    const ctx = gsap.context(() => {
      gsap.set(map, { opacity: 0, scale: 1.08 });
      gsap.set([...copy.children, cta, hint], { opacity: 0, y: 16 });
      gsap.set(grid.children, { opacity: 0, y: 16 });
      // Hidden cards must not catch the pointer over the CTA beneath them.
      gsap.set(grid, { pointerEvents: "none" });

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
        .to([...copy.children, cta], { opacity: 1, y: 0, stagger: 0.05, duration: 0.35 }, 0.1)
        .to(hint, { opacity: 1, y: 0, duration: 0.3 }, 0.45)
        .to({}, { duration: 0.3 })
        .set(copy, { pointerEvents: "none" })
        .to([copy, hint], { opacity: 0, y: -12, duration: 0.5 })
        .to(
          cta,
          {
            x: () => ctaTarget().x,
            y: () => ctaTarget().y,
            opacity: () => ctaTarget().opacity,
            ease: "power2.inOut",
            duration: 1.2,
          },
          "<",
        )
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
        .set(grid, { pointerEvents: "auto" }, "-=0.6")
        .to(grid.children, { opacity: 1, y: 0, stagger: 0.1, duration: 0.5 }, "-=0.6")
        .to({}, { duration: 0.4 });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  const rm = reducedMotion;

  // Tall tile. Its image area is where the journey's map lands (animated), so
  // its own outline is hidden until then; the static version shows it here.
  const indiaTile = (
    <BentoCard
      key="india"
      name="ALL OF INDIA"
      description="Every state and union territory, watched in one place."
      Icon={MapPinned}
      background={
        <div ref={indiaSlotRef} aria-hidden className="pointer-events-none absolute inset-x-3 top-5 bottom-[33%] md:inset-x-3 md:top-5">
          <div className={`absolute inset-0 opacity-90 dark:invert ${rm ? "" : "hidden"}`}>
            <Image src="/landing/india/india-outline-states.svg" alt="" fill className="object-contain" />
          </div>
        </div>
      }
      className="col-span-1 row-span-2 bg-card/80 backdrop-blur-sm dark:bg-card/80"
    >
      <ShineBorder shineColor={SHINE_COLORS} />
    </BentoCard>
  );

  const grid = (
    <div
      ref={gridWrapRef}
      className={
        rm
          ? "relative flex w-full justify-center md:px-10"
          : "pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 max-md:pt-20 max-md:pb-6 md:px-10 md:pt-16 md:pb-24"
      }
    >
      {/* Mobile: four rows fit under the nav — the stage height minus the
          nav, padding and gaps (≈140px), split four ways, up to 8.75rem. */}
      <BentoGrid
        ref={gridRef}
        className="max-w-md auto-rows-[clamp(6.5rem,calc((var(--stage-h,100svh)-140px)/4),8.75rem)] grid-cols-2 gap-3 md:max-w-5xl md:auto-rows-[clamp(8.5rem,calc((var(--stage-h,100svh)-250px)/3),11rem)] md:grid-cols-3 md:gap-4"
      >
        {CATEGORIES.map(({ title, description, Icon, Art, span }, i) => [
          i === 1 ? indiaTile : null,
          <BentoCard
            key={title}
            name={title}
            description={description}
            Icon={Icon}
            background={<Art />}
            className={`${rm && title.startsWith("GOVERNMENT") ? "col-span-2 md:col-span-3" : span} bg-card/80 backdrop-blur-sm dark:bg-card/80`}
          >
            <ShineBorder shineColor={SHINE_COLORS} />
          </BentoCard>,
        ])}
        {/* Where the Enter button lands (desktop only). */}
        <div
          ref={ctaTileRef}
          className={`relative hidden overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur-sm md:block dark:border-white/10 ${rm ? "md:hidden" : ""}`}
        >
          <ShineBorder shineColor={SHINE_COLORS} />
          <p className="absolute inset-x-0 top-4 text-center font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
            LIVE DASHBOARD
          </p>
        </div>
      </BentoGrid>
    </div>
  );

  return (
    <section
      ref={sectionRef}
      className={
        rm
          ? "relative flex w-full flex-col items-center overflow-hidden bg-background px-6"
          : "relative z-0 h-[var(--stage-h,100svh)] w-full overflow-hidden bg-background"
      }
    >
      <div
        ref={revealRef}
        className={`flex flex-col items-center justify-center gap-5 px-6 text-center ${rm ? "relative min-h-[var(--stage-h,100svh)] py-16" : "absolute inset-0 pb-12 max-md:pt-20 max-md:pb-16 max-md:gap-4"}`}
      >
        {/* Width-based size: vh sizing made both silhouettes resize whenever
            the window height changed (e.g. docking devtools). On mobile it is
            also capped by --stage-h (fixed per width, so Safari's collapsing
            toolbars don't resize it) minus the nav, copy, CTA and hint, so the
            reveal fits short screens instead of running under the nav. */}
        <div
          ref={mapRef}
          className="pointer-events-none relative z-20 size-[clamp(120px,calc(var(--stage-h,100svh)-490px),min(76vw,320px))] opacity-90 dark:invert md:size-[clamp(220px,20vw,300px)]"
        >
          {/* India's southern tip sits 36.2% across this square box (the
              outline SVG is letterboxed and the tip is west of centre);
              shifting 13.8% puts it directly above the "D" of INDIA. */}
          <div className="absolute inset-0 translate-x-[13.8%]">
            <Image src="/landing/india/india-outline-states.svg" alt="Outline map of India" fill className="object-contain" />
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
        </div>

        <div ref={ctaRef} className="relative z-20 -mt-2">
          {/* Display-font caps like the nav wordmark: देश has no glyphs in
              the mono font and sat above its baseline, looking detached. */}
          <ShimmerLink
            href="/monitor?utm_source=deshmonitor&utm_medium=landing&utm_campaign=enter_monitor&utm_content=india_reveal_cta"
            borderRadius="0px"
            background="var(--background)"
            shimmerColor="#2dd4bf"
            className="inline-flex gap-2 border-foreground/30 font-display text-sm tracking-[0.2em] text-foreground sm:text-base"
          >
            ENTER <Desh tooltip={false} /> MONITOR
            <span aria-hidden>→</span>
          </ShimmerLink>
        </div>

        {/* The static counterpart of the animated hint below; dropped as
            soon as this screen starts scrolling away. */}
        {rm && !hintHidden && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-1 text-muted-foreground">
            <span className="font-mono text-[11px] tracking-[0.3em]">SEE WHAT WE&apos;RE WATCHING</span>
            <ChevronDown className="size-4" aria-hidden />
          </div>
        )}
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

      {rm ? (
        // Static version of the animated end state: the India tile carries
        // the outline. In reduced mode each of the two stages is one full
        // screen, as in the animated version.
        <div className="relative flex min-h-[var(--stage-h,100svh)] w-full items-center py-16">
          {grid}
        </div>
      ) : (
        grid
      )}
    </section>
  );
}
