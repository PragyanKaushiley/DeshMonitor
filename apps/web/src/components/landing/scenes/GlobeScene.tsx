"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
// `three` / `three-globe` are dynamically imported inside the effect:
// three-globe touches `window` at module scope (crashes SSR), and wrapping
// this whole component in next/dynamic(ssr:false) crashed React's
// reconciler ("insertBefore: not a child of this node").
import type * as THREE from "three";
import { gsap, ScrollTrigger } from "@/lib/landing/gsapSetup";
import { getGlobeTheme, type GlobeThemeColors } from "@/lib/landing/globeTheme";
import { markGlobeReady, onGlobeIntro, resetGlobeReady } from "@/lib/landing/globeReady";
import { fetchJson } from "@/lib/landing/assetLoader";
import { LightRays } from "@/components/ui/light-rays";
import type { LandingPhase } from "../CinematicJourney";
import { Desh } from "../Desh";

export const INDIA_LAT = 20.5937;
export const INDIA_LNG = 78.9629;
export const INDIA_COORDS_LABEL = "20.5937° N, 78.9629° E";

// Camera target. Latitude: the boundary polygon's area-weighted centroid
// (the official centre point above sits ~2.8° further south, leaving the
// zoomed shape off-centre). Longitude: Kanyakumari, India's southern tip —
// IndiaJourney's outline has its tip centred above the "D" of INDIA, so
// centring the same meridian here lines the two silhouettes up through the
// crossfade.
const INDIA_TARGET_LAT = 23.4;
const INDIA_TARGET_LNG = 77.54;
const INDIA_ISO_A3 = "IND";

const GLOBE_RADIUS = 100; // three-globe's internal sphere radius
const FOV = 50;
const TAN_HALF_FOV = Math.tan(((FOV / 2) * Math.PI) / 180);
// Landscape screens keep a fixed *horizontal* field of view (the look of a
// 16:10 screen at FOV 50), so the globe's size follows the width and doesn't
// change when only the height does (e.g. docking devtools at the bottom).
const REFERENCE_ASPECT = 1.6;
const TAN_HALF_HFOV = TAN_HALF_FOV * REFERENCE_ASPECT;
const DESKTOP_REST_DISTANCE = GLOBE_RADIUS * 3.1;
const INTRO_START_DISTANCE = GLOBE_RADIUS * 1.7;
const ZOOM_DISTANCE = GLOBE_RADIUS * 1.42;
const MOBILE_BREAKPOINT = 768;
// Mobile: globe shifted right by this fraction of the viewport width.
const MOBILE_SHIFT = 0.3;

// pinSpacing is off: IndiaJourney sits directly beneath this section, pins
// at 100% and stays still while this whole section fades out on top of it.
// Measured against the section (stage) height, not the live viewport.
const PIN_LENGTH_FACTOR = 1.2;
// Rotation lands on India here; the zoom keeps going linearly through the
// crossfade to the end of the pin. Both are linear on purpose: ease-in-out
// barely moved near its ends and raced through the middle, which read as
// "stuck, then shoots" when scrolling back up from IndiaJourney.
const ROTATE_END_T = 0.75;
const FADE_START = 0.75;
const BRAND_FADE_START = 0.6;
const BRAND_FADE_END = 0.75;
const HINT_FADE_END = 0.03;

const IDLE_RESUME_MS = 600;
const IDLE_SPEED = 0.05; // radians/sec
const TWO_PI = Math.PI * 2;

interface CountryFeature {
  type: "Feature";
  properties: { ISO_A3: string; NAME: string };
  geometry: { type: string; coordinates: unknown };
}

function isIndia(feature: object): boolean {
  return (feature as CountryFeature).properties?.ISO_A3 === INDIA_ISO_A3;
}

function computeYawPitch(vec: { x: number; y: number; z: number }): { yaw: number; pitch: number } {
  const yaw = Math.atan2(-vec.x, vec.z);
  const pitch = Math.atan2(vec.y, Math.sqrt(vec.x * vec.x + vec.z * vec.z));
  return { yaw, pitch };
}

function clamp01(v: number) {
  return Math.min(Math.max(v, 0), 1);
}

function currentTheme(): GlobeThemeColors {
  return getGlobeTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
}

export function GlobeScene({
  reducedMotion,
  phase,
  onStatusChange,
}: {
  reducedMotion: boolean;
  phase: LandingPhase;
  onStatusChange?: (status: string) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const hintWrapRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLSpanElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [heroOnScreen, setHeroOnScreen] = useState(true);

  useEffect(() => {
    if (reducedMotion) {
      markGlobeReady();
      return;
    }

    const section = sectionRef.current;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const canvasWrapper = canvasWrapperRef.current;
    const brand = brandRef.current;
    const hint = hintRef.current;
    if (!section || !container || !canvas || !canvasWrapper || !brand || !hint) return;

    resetGlobeReady();
    let cancelled = false;
    let disposeAll: () => void = () => {};

    // Created synchronously, before the async three/GeoJSON setup, so this
    // pin's scroll space exists before any later trigger measures the page.
    const scroll = { t: 0 };
    let lastStatus = "";
    function setStatus(status: string) {
      if (status === lastStatus) return;
      lastStatus = status;
      onStatusChange?.(status);
    }
    function applyScrollUi(t: number) {
      brand!.style.opacity = String(1 - clamp01((t - BRAND_FADE_START) / (BRAND_FADE_END - BRAND_FADE_START)));
      hint!.style.opacity = String(1 - clamp01(t / HINT_FADE_END));
      const sectionOpacity = 1 - clamp01((t - FADE_START) / (1 - FADE_START));
      section!.style.opacity = String(sectionOpacity);
      // Still on top while fading — let clicks reach the India section below.
      section!.style.pointerEvents = sectionOpacity < 0.5 ? "none" : "";
    }

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: () => `+=${section.offsetHeight * PIN_LENGTH_FACTOR}`,
      // Lenis already smooths the scroll; an extra scrub lag here fell out
      // of step with IndiaJourney's timeline during the crossfade.
      scrub: true,
      pin: true,
      pinSpacing: false,
      onLeave: () => setHeroOnScreen(false),
      onEnterBack: () => setHeroOnScreen(true),
      onUpdate: (self) => {
        scroll.t = self.progress;
        if (self.progress >= ROTATE_END_T - 0.05) setStatus(INDIA_COORDS_LABEL);
        else if (self.progress >= 0.2) setStatus("LOCATING INDIA");
        else setStatus("ORBITING");
        applyScrollUi(self.progress);
      },
    });
    setStatus("ORBITING");
    applyScrollUi(0);

    async function setup() {
      const [THREE, { default: ThreeGlobe }] = await Promise.all([import("three"), import("three-globe")]);

      // Same cached promises the loader already resolved — no second download/parse.
      const [world, india] = await Promise.allSettled([
        fetchJson<{ features: CountryFeature[] }>("/landing/globe/countries-110m.geojson"),
        fetchJson<{ features: CountryFeature[] }>("/landing/globe/india-boundary.geojson"),
      ]);
      // Missing country data degrades to a bare sphere rather than blocking the scene.
      let countries: CountryFeature[] = world.status === "fulfilled" ? world.value.features : [];
      // Swap Natural Earth's coarse India for the OSM-derived boundary.
      const preciseIndia = india.status === "fulfilled" ? india.value.features[0] : undefined;
      if (preciseIndia) countries = [...countries.filter((f) => !isIndia(f)), preciseIndia];
      if (cancelled || !container || !canvas) return;

      const theme = currentTheme();
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 4000);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      // A full-screen canvas at 2x on a large retina display is ~4x the
      // pixels of 1x — the atmosphere shader alone made that the main cost
      // competing with the loader handoff. 1.5x keeps the wireframe crisp.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      const globeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(theme.background),
        transparent: true,
        opacity: 0.85,
      });

      const globe = new ThreeGlobe()
        .showGlobe(true)
        .globeMaterial(globeMaterial)
        .showGraticules(true)
        .showAtmosphere(true)
        .atmosphereColor(theme.atmosphere)
        .atmosphereAltitude(0.18)
        .polygonsData(countries)
        .polygonCapColor((f) => (isIndia(f) ? `${theme.accent}55` : "rgba(0,0,0,0)"))
        .polygonSideColor(() => "rgba(0,0,0,0)")
        .polygonStrokeColor((f) => (isIndia(f) ? theme.accent : theme.wireframe))
        .polygonAltitude((f) => (isIndia(f) ? 0.018 : 0.006))
        // The default 1s altitude transition rebuilds polygon geometry every
        // frame — right during the loader handoff, and again on theme changes.
        .polygonsTransitionDuration(0);
      scene.add(globe);
      scene.background = null;

      const indiaCoords = globe.getCoords(INDIA_TARGET_LAT, INDIA_TARGET_LNG, 0);
      const { yaw: targetYaw, pitch: targetPitch } = computeYawPitch(
        new THREE.Vector3(indiaCoords.x, indiaCoords.y, indiaCoords.z).normalize(),
      );

      // --- Framing: responsive rest distance + mobile lens shift ---
      const view = { width: 1, height: 1, mobile: false, restDistance: DESKTOP_REST_DISTANCE };
      const intro = { t: 0 };

      function resize() {
        if (!container) return;
        const { clientWidth: w, clientHeight: h } = container;
        if (w === 0 || h === 0) return;
        const aspect = w / h;
        view.width = w;
        view.height = h;
        view.mobile = w < MOBILE_BREAKPOINT;
        if (aspect >= 1) {
          const tanHalfV = Math.min(TAN_HALF_HFOV / aspect, TAN_HALF_FOV * 1.4);
          camera.fov = (2 * Math.atan(tanHalfV) * 180) / Math.PI;
          // Only back off if a very short window would otherwise crop the globe.
          view.restDistance = Math.max(DESKTOP_REST_DISTANCE, GLOBE_RADIUS / (0.9 * tanHalfV));
        } else {
          // Portrait: back off until the globe fits ~90% of the width.
          camera.fov = FOV;
          view.restDistance = Math.max(DESKTOP_REST_DISTANCE, GLOBE_RADIUS / (0.9 * TAN_HALF_FOV * aspect));
        }
        camera.aspect = aspect;
        renderer.setSize(w, h, false);
      }
      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      function applyCamera(zoomT: number, rotateT: number) {
        const rest = INTRO_START_DISTANCE + (view.restDistance - INTRO_START_DISTANCE) * intro.t;
        camera.position.z = rest + (ZOOM_DISTANCE - rest) * zoomT;
        const shift = view.mobile ? MOBILE_SHIFT * view.width * (1 - rotateT) : 0;
        if (shift > 0.5) {
          camera.setViewOffset(view.width, view.height, -shift, 0, view.width, view.height);
        } else {
          camera.clearViewOffset();
        }
        camera.updateProjectionMatrix();
      }

      // --- Rotation ---
      // Idle spin + drag own rotation at the top. Once scrolling starts, the
      // current orientation (drag folded in) is captured and interpolated to
      // India over a fixed scroll distance — a larger angular gap just spins
      // faster. Drag during the scroll fades out so India always ends centred.
      let idleYaw = 0.6;
      let dragYaw = 0;
      let dragPitch = 0;
      let scrollStart: { yaw: number; pitch: number; delta: number } | null = null;
      let dragging = false;
      let lastActivity = performance.now();
      let lastPointer = { x: 0, y: 0 };

      function applyRotation(rotateT: number) {
        if (scroll.t <= 0.0005) {
          if (scrollStart) {
            idleYaw = scrollStart.yaw + dragYaw;
            dragPitch = scrollStart.pitch + dragPitch;
            dragYaw = 0;
            scrollStart = null;
          }
          globe.rotation.y = idleYaw + dragYaw;
          globe.rotation.x = THREE.MathUtils.clamp(dragPitch, -1, 1);
          return;
        }
        if (!scrollStart) {
          const yaw = (((idleYaw + dragYaw) % TWO_PI) + TWO_PI) % TWO_PI;
          const delta = (((targetYaw - yaw) % TWO_PI) + TWO_PI) % TWO_PI;
          scrollStart = { yaw, pitch: dragPitch, delta };
          dragYaw = 0;
          dragPitch = 0;
        }
        const residual = 1 - rotateT;
        globe.rotation.y = scrollStart.yaw + scrollStart.delta * rotateT + dragYaw * residual;
        globe.rotation.x = THREE.MathUtils.clamp(
          scrollStart.pitch + (targetPitch - scrollStart.pitch) * rotateT + dragPitch * residual,
          -1,
          1,
        );
      }

      function onPointerDown(e: PointerEvent) {
        dragging = true;
        lastActivity = performance.now();
        lastPointer = { x: e.clientX, y: e.clientY };
        canvas!.setPointerCapture(e.pointerId);
      }
      function onPointerMove(e: PointerEvent) {
        if (!dragging) return;
        lastActivity = performance.now();
        dragYaw += (e.clientX - lastPointer.x) * 0.005;
        // Positive x-rotation moves the front of the globe down, so dragging
        // down (positive dy) must increase pitch for the surface to follow.
        dragPitch = THREE.MathUtils.clamp(dragPitch + (e.clientY - lastPointer.y) * 0.005, -1, 1);
        lastPointer = { x: e.clientX, y: e.clientY };
      }
      function onPointerUp(e: PointerEvent) {
        dragging = false;
        lastActivity = performance.now();
        canvas!.releasePointerCapture(e.pointerId);
      }
      canvas.style.touchAction = "pan-y";
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);

      let lastTickTime = performance.now();
      function render() {
        const rotateT = clamp01(scroll.t / ROTATE_END_T);
        applyCamera(scroll.t, rotateT);
        applyRotation(rotateT);
        renderer.render(scene, camera);
      }
      function tick() {
        const now = performance.now();
        const dt = (now - lastTickTime) / 1000;
        lastTickTime = now;
        // Past the end of the pin the hero is fully faded and scrolled away —
        // stop redrawing the full-screen canvas until it comes back.
        if (scroll.t >= 1) return;
        if (!dragging && now - lastActivity > IDLE_RESUME_MS && scroll.t <= 0.0005) {
          idleYaw += IDLE_SPEED * dt;
        }
        render();
      }
      gsap.ticker.add(tick);

      // Intro: zoom out from close to the resting distance while the
      // loader's wordmark flies into place.
      let introPlayed = false;
      onGlobeIntro(() => {
        if (introPlayed) return;
        introPlayed = true;
        gsap.to(intro, { t: 1, duration: 1.4, ease: "power2.out" });
        gsap.to(canvasWrapper, { opacity: 1, duration: 1, ease: "power1.out" });
      });

      // Recolour on the <html> class flip itself, not next-themes' state:
      // the theme toggler only calls setTheme after its 700ms wipe, so
      // listening to resolvedTheme lagged the rest of the page. Rendering
      // immediately gets the new colours into the view-transition snapshot.
      const themeObserver = new MutationObserver(() => {
        const t = currentTheme();
        globeMaterial.color.set(t.background);
        globe.atmosphereColor(t.atmosphere);
        globe.polygonStrokeColor((f) => (isIndia(f) ? t.accent : t.wireframe));
        globe.polygonCapColor((f) => (isIndia(f) ? `${t.accent}55` : "rgba(0,0,0,0)"));
        render();
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      render();
      markGlobeReady();

      disposeAll = () => {
        gsap.ticker.remove(tick);
        themeObserver.disconnect();
        resizeObserver.disconnect();
        canvas!.removeEventListener("pointerdown", onPointerDown);
        canvas!.removeEventListener("pointermove", onPointerMove);
        canvas!.removeEventListener("pointerup", onPointerUp);
        canvas!.removeEventListener("pointercancel", onPointerUp);
        onGlobeIntro(null);
        globeMaterial.dispose();
        renderer.dispose();
      };
    }

    setup().catch(() => {
      // WebGL unavailable (GPU blocklisted, hardware acceleration off, …):
      // show the static poster instead of an empty hero, and never hold the
      // loader hostage.
      if (!cancelled) setWebglFailed(true);
      markGlobeReady();
    });

    return () => {
      cancelled = true;
      st.kill();
      disposeAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const ready = phase === "ready";

  // Light rays' animated blur filters are expensive; mount them only once the
  // handoff has fully settled so they don't compete with it.
  const [showRays, setShowRays] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setShowRays(true), 900);
    return () => window.clearTimeout(id);
  }, [ready]);

  useEffect(() => {
    if (!ready || reducedMotion) return;
    const tagline = taglineRef.current;
    const hintWrap = hintWrapRef.current;
    if (!tagline || !hintWrap) return;
    const tl = gsap
      .timeline({ delay: 0.05 })
      .fromTo(
        tagline.children,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: "power3.out" },
      )
      .fromTo(hintWrap, { opacity: 0 }, { opacity: 1, duration: 0.8 }, "-=0.3");
    return () => {
      tl.kill();
    };
  }, [ready, reducedMotion]);

  if (reducedMotion) {
    return (
      <section
        ref={sectionRef}
        aria-label="Globe: India"
        className="relative flex h-[var(--stage-h,100svh)] w-full flex-col items-center justify-center gap-6 bg-background"
      >
        <div className="relative size-[min(50vh,80vw)] dark:invert">
          <Image src="/landing/globe/poster.webp" alt="A stylized globe centered on India" fill className="object-contain" priority />
        </div>
        <h1 data-hero-brand className="inline-block font-display text-4xl text-foreground sm:text-6xl">
          <Desh explain /> Monitor
        </h1>
        <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{INDIA_COORDS_LABEL}</p>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Globe: India"
      className="relative z-10 h-[var(--stage-h,100svh)] w-full overflow-hidden bg-background"
    >
      <div ref={canvasWrapperRef} className="absolute inset-0 opacity-0">
        <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing">
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
      </div>

      {webglFailed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative size-[min(80vw,560px)] opacity-90 dark:invert">
            <Image src="/landing/globe/poster.webp" alt="A stylized globe centered on India" fill className="object-contain" priority />
          </div>
        </div>
      )}

      {/* Unmounted (not just hidden) off-screen — their JS animations would
          otherwise keep running while the rest of the page is read. */}
      {showRays && heroOnScreen && (
        <div className="pointer-events-none absolute inset-0 animate-in fade-in duration-[1500ms]">
          <LightRays color="var(--light-ray)" count={6} blur={28} length="85%" />
        </div>
      )}

      <div
        ref={brandRef}
        className="pointer-events-none absolute inset-x-0 bottom-24 flex flex-col items-start px-6 sm:px-12 md:inset-x-auto md:inset-y-0 md:right-0 md:w-[42%] md:items-end md:justify-center md:text-right"
      >
        <h1
          data-hero-brand
          className="inline-block whitespace-nowrap font-display text-4xl text-foreground sm:text-5xl lg:text-7xl"
          style={{ opacity: ready ? 1 : 0 }}
        >
          <Desh explain /> Monitor
        </h1>
        <span ref={taglineRef} className="mt-4 max-w-md font-display text-lg text-muted-foreground sm:text-xl">
          <span className="block opacity-0">India is constantly changing.</span>
          <span className="block opacity-0">This is where you watch it happen.</span>
        </span>
      </div>

      <div ref={hintWrapRef} className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center opacity-0">
        <div ref={hintRef} className="flex flex-col items-center gap-1 text-muted-foreground">
          <span className="font-mono text-[11px] tracking-[0.3em]">SCROLL</span>
          <ChevronDown className="size-4 animate-bounce [animation-duration:2s]" aria-hidden />
        </div>
      </div>
    </section>
  );
}
