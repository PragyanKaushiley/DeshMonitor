"use client";

import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Undo2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SEVERITY, SEVERITY_ORDER } from "@/lib/monitor/categories";
import { layoutLabels } from "@/lib/monitor/labels";
import type { Signal } from "@/lib/monitor/types";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import { normStateName, stateRings, stateRingsNow } from "@/lib/monitor/stateShapes";

// India drawn straight from the boundary GeoJSON the landing page already
// ships — a plain equirectangular projection with longitude squeezed by
// cos(22.5°), which is close enough over India's latitudes and needs no
// mapping library.

const BOUNDARY = "/landing/globe/india-boundary.geojson";
// The lines where two states meet, and nothing else: the coast is drawn once,
// from the country outline, so the two never disagree about where it runs.
const BORDERS = "/landing/globe/india-borders.geojson";
// For each state, the stretch of the country's outline that touches it (its
// coast and its international border), as plain lines.
const COAST = "/landing/globe/india-coast.geojson";
const LNG_SCALE = Math.cos((22.5 * Math.PI) / 180);

// The drawing box. Fixed so markers and paths share one coordinate space.
const VIEW = { width: 1000, height: 1100 };
const BOUNDS = { minLng: 67.9, maxLng: 97.6, minLat: 6.5, maxLat: 37.3 };

function project(lng: number, lat: number): [number, number] {
  const x = ((lng - BOUNDS.minLng) * LNG_SCALE) / ((BOUNDS.maxLng - BOUNDS.minLng) * LNG_SCALE);
  const y = (BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat);
  return [x * VIEW.width, y * VIEW.height];
}

type Ring = [number, number][];
interface GeoJson {
  features: { geometry: { type: string; coordinates: unknown } }[];
}

// Landmasses smaller than this (in drawing units) — the Lakshadweep atolls,
// a couple of kilometres across — are drawn bolder so they stay visible.
const ISLET_SIZE = 6;

// How far the map may zoom (the smallest state fills the box at about this).
const MAX_ZOOM = 9;

// Name size on screen, in pixels.
const LABEL_PX = 11;

interface MapPath {
  d: string;
  islet: boolean;
  // Longest side, in drawing units: whether an islet still counts as a speck
  // depends on how big it is on screen, which changes with the zoom.
  size: number;
}

function toPaths(geo: GeoJson): MapPath[] {
  const paths: MapPath[] = [];
  const addRing = (ring: Ring) => {
    if (ring.length < 3) return;
    const points = ring.map(([lng, lat]) => project(lng, lat));
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const islet = size < ISLET_SIZE;
    const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    paths.push({ d: `${d} Z`, islet, size });
  };

  for (const feature of geo.features) {
    const { type, coordinates } = feature.geometry;
    if (type === "Polygon") (coordinates as Ring[]).forEach(addRing);
    else if (type === "MultiPolygon") (coordinates as Ring[][][]).forEach((poly) => poly.forEach((r) => addRing(r as unknown as Ring)));
  }
  return paths;
}

interface Border {
  a: string;
  b: string;
  d: string;
}

function linePath(points: [number, number][]): string {
  return points.map(([lng, lat], i) => `${i === 0 ? "M" : "L"}${project(lng, lat).map((n) => n.toFixed(1)).join(" ")}`).join(" ");
}

function toBorders(geo: {
  features: { properties: { a: string; b: string }; geometry: { type: string; coordinates: unknown } }[];
}): Border[] {
  return geo.features.map(({ properties, geometry }) => ({
    a: properties.a,
    b: properties.b,
    d:
      geometry.type === "MultiLineString"
        ? (geometry.coordinates as [number, number][][]).map(linePath).join(" ")
        : linePath(geometry.coordinates as [number, number][]),
  }));
}

// The land, the state borders and the country outline: hundreds of paths that
// only change when the zoom does. Stroke widths are set once per group (the
// paths inherit them), so a zoom rewrites a handful of attributes instead of
// one on every path, and the memo skips the whole layer when only the region
// or the signals change.
const LandLayers = memo(function LandLayers({
  paths,
  borders,
  focusRegion,
  zoom,
  pxScale,
  gridId,
}: {
  paths: MapPath[] | null;
  borders: Border[];
  focusRegion: string | null;
  zoom: number;
  pxScale: number;
  gridId: string;
}) {
  // A landmass is only a speck (drawn as a bold dot) while it is tiny on screen;
  // zoomed into the islands it is just land again.
  const { land, specks } = useMemo(() => {
    const land: { p: MapPath; i: number }[] = [];
    const specks: { p: MapPath; i: number }[] = [];
    (paths ?? []).forEach((p, i) => (p.islet && p.size * pxScale < 5 ? specks : land).push({ p, i }));
    return { land, specks };
  }, [paths, pxScale]);
  const focus = focusRegion === null ? null : normStateName(focusRegion);

  return (
    <>
      {/* The land sits on a lighter base than the dimmed surround, so the
          country stands out from the sea around it. */}
      <g fill="var(--card)">
        {land.map(({ p, i }) => (
          <path key={i} d={p.d} />
        ))}
      </g>

      {borders.length > 0 && (
        <g aria-hidden fill="none" stroke="var(--map-line, #2dd4bf)" strokeLinejoin="round" strokeLinecap="round" strokeOpacity={0.5} strokeWidth={1.1 / zoom}>
          {borders.map(({ a, b, d }, i) =>
            // The borders of the state in focus are drawn firmer.
            focus !== null && (normStateName(a) === focus || normStateName(b) === focus) ? (
              <path key={i} d={d} strokeOpacity={0.95} strokeWidth={2.4 / zoom} />
            ) : (
              <path key={i} d={d} />
            ),
          )}
        </g>
      )}

      {/* The dot grid is the land's own fill. A clip path over the whole
          drawing made every theme change repaint for over a second. */}
      <g fill={`url(#${gridId})`} stroke="var(--map-line, #2dd4bf)" strokeOpacity={0.55} strokeWidth={1.6 / zoom} strokeLinejoin="round">
        {land.map(({ p, i }) => (
          <path key={i} d={p.d} />
        ))}
      </g>
      <g fill="var(--map-line, #2dd4bf)" stroke="var(--map-line, #2dd4bf)" strokeOpacity={0.9} strokeWidth={3.5 / zoom} strokeLinejoin="round">
        {specks.map(({ p, i }) => (
          <path key={i} d={p.d} />
        ))}
      </g>
    </>
  );
});

function ZoomButton({
  label,
  icon: Icon,
  factor,
  onZoom,
}: {
  label: string;
  icon: typeof Plus;
  factor: number;
  onZoom: (factor: number) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onZoom(factor)}
      className="grid size-7 place-items-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur-sm transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
    >
      <Icon aria-hidden className="size-3.5" />
    </button>
  );
}

export function IndiaMap({
  signals,
  selectedId,
  onSelect,
  pulseId,
  breadcrumb,
  onLoaded,
  region = "All India",
  onResetRegion,
  className = "",
}: {
  signals: Signal[];
  selectedId: string | null;
  onSelect: (signal: Signal) => void;
  pulseId: string | null;
  breadcrumb: string;
  // Called once the outline and borders are drawn.
  onLoaded?: () => void;
  // The chosen state: the map glides in until it fills the box.
  region?: string;
  // Back to the whole country (the button shown while a state is chosen).
  onResetRegion?: () => void;
  className?: string;
}) {
  const [paths, setPaths] = useState<MapPath[] | null>(null);
  const [borders, setBorders] = useState<Border[]>([]);
  const [coast, setCoast] = useState<Record<string, string>>({});
  // The outline, the borders and the land fill appear together: without
  // this the borders arrived first and the land sat in the background colour
  // until the outline came in.
  const [statesDone, setStatesDone] = useState(false);
  const mapReady = paths !== null && statesDone;
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  useEffect(() => {
    if (mapReady) onLoadedRef.current?.();
  }, [mapReady]);
  // Zoom, and where the zoomed map is shifted to, in pixels.
  const [view, setView] = useState({ zoom: 1, tx: 0, ty: 0 });
  const { zoom } = view;
  // The part of the view that has been "baked" into the drawing. While the map
  // moves it is scaled as a bitmap through the svg's CSS transform (cheap, but
  // blurry); once it stops, the zoom is applied inside the svg instead, so the
  // browser draws the vectors at their real size. Phone browsers keep the
  // blurry bitmap after a CSS scale, which is why the CSS transform is dropped
  // at rest rather than left in place.
  const [settled, setSettled] = useState(view);
  // The state's own outline, drawn stronger while it is the one in focus.
  const [focusPath, setFocusPath] = useState<string | null>(null);
  // The state the map is showing. It changes in the same step as the zoom,
  // not when the picker does, so the darker lines and the zoom start together
  // (the zoom has to wait for the state's shape to load).
  const [focusRegion, setFocusRegion] = useState<string | null>(null);
  // Markers and names are hidden while the map is moving, then fade back at
  // the new size (their drawing sizes depend on the zoom, and resizing them
  // mid-move would make them jump).
  const [moving, setMoving] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const gridId = useId();

  const failed = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  // On-screen pixels per drawing unit, so names stay a readable size on a
  // phone as well as on a wide screen.
  const [scale, setScale] = useState(0.5);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box && box.width > 0 && box.height > 0) {
        setScale(Math.min(box.width / VIEW.width, box.height / VIEW.height));
        setBox({ w: box.width, h: box.height });
      }
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(BOUNDARY)
      .then((res) => res.json())
      // Temporary: hold the loading skeleton on screen for review.
      .then(async (geo: GeoJson) => {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        return geo;
      })
      .then((geo: GeoJson) => {
        if (!cancelled) setPaths(toPaths(geo));
      })
      .catch(() => {
        // The outline is decoration around the markers; if it can't be
        // fetched the markers still place correctly on the empty field.
        failed.current = true;
        if (!cancelled) setPaths([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(BORDERS)
      .then((res) => res.json())
      .then((geo) => {
        if (!cancelled) setBorders(toBorders(geo));
      })
      // Internal borders are a refinement; the country outline stands alone.
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatesDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the state shapes up front so the first zoom starts at once.
  useEffect(() => {
    void stateRings("India");
  }, []);

  // Glide into the chosen state. The zoom is whatever makes its bounding box
  // fill the map box (with a little air); the shift puts its centre in the
  // middle of the box. The svg is drawn "meet"-fitted and scaled about its
  // centre, so a point P (pixels from the svg's centre) lands at zoom*P + shift.
  // A layout effect, not an effect: it runs before the browser paints the
  // render the pick caused, so the zoom starts on that very frame.
  useLayoutEffect(() => {
    let cancelled = false;
    const frame = frameRef.current;
    if (region === "All India" || !frame) {
      setFocusPath(null);
      setFocusRegion(null);
      setView((v) => (v.zoom === 1 && v.tx === 0 && v.ty === 0 ? v : { zoom: 1, tx: 0, ty: 0 }));
      return;
    }
    const apply = (rings: [number, number][][]) => {
      if (cancelled || rings.length === 0) return;
      const points = rings.flatMap((ring) => ring.map(([lng, lat]) => project(lng, lat)));
      const xs = points.map(([x]) => x);
      const ys = points.map(([, y]) => y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const { width: boxW, height: boxH } = frame.getBoundingClientRect();
      const bw = Math.max(x1 - x0, 1) * scale;
      const bh = Math.max(y1 - y0, 1) * scale;
      const z = Math.min(MAX_ZOOM, Math.max(1, Math.min(boxW / bw, boxH / bh) * 0.88));
      const cx = ((x0 + x1) / 2 - VIEW.width / 2) * scale;
      const cy = ((y0 + y1) / 2 - VIEW.height / 2) * scale;
      setMoving(true);
      setFocusRegion(region);
      setView({ zoom: z, tx: -z * cx, ty: -z * cy });
      setFocusPath(
        rings
          .map((ring) => `${ring.map(([lng, lat], i) => `${i === 0 ? "M" : "L"}${project(lng, lat).map((n) => n.toFixed(1)).join(" ")}`).join(" ")} Z`)
          .join(" "),
      );
    };
    // The shapes are normally already here (they are fetched on load), so no await.
    const now = stateRingsNow(region);
    if (now) apply(now);
    else void stateRings(region).then(apply);
    return () => {
      cancelled = true;
    };
  }, [region, scale]);

  // The move is over: show markers and names again. A timeout backs up
  // transitionend, which doesn't fire when nothing actually moved.
  // Bake the finished zoom into the drawing (before paint, so nothing flashes).
  useLayoutEffect(() => {
    if (!moving) setSettled(view);
  }, [moving, view]);

  useEffect(() => {
    if (!moving) return;
    const timer = window.setTimeout(() => setMoving(false), reducedMotion ? 0 : 950);
    return () => window.clearTimeout(timer);
  }, [moving, view, reducedMotion]);

  useEffect(() => {
    let cancelled = false;
    fetch(COAST)
      .then((res) => res.json())
      .then((geo: { features: { properties: { name: string }; geometry: { type: string; coordinates: unknown } }[] }) => {
        if (cancelled) return;
        const byState: Record<string, string> = {};
        for (const { properties, geometry } of geo.features) {
          byState[normStateName(properties.name)] =
            geometry.type === "MultiLineString"
              ? (geometry.coordinates as [number, number][][]).map(linePath).join(" ")
              : linePath(geometry.coordinates as [number, number][]);
        }
        setCoast(byState);
      })
      // Only the darker edge is lost; the zoom still works.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const located = useMemo(() => signals.filter((s) => s.lat !== null && s.lng !== null), [signals]);

  // One name per place, however many signals it has: the worst severity
  // decides its colour and its place in the queue for a good spot.
  const places = useMemo(() => {
    const byPlace = new Map<string, { text: string; x: number; y: number; rank: number }>();
    for (const signal of located) {
      const rank = SEVERITY_ORDER.indexOf(signal.severity);
      const known = byPlace.get(signal.place);
      if (!known || rank < known.rank) {
        const [x, y] = project(signal.lng as number, signal.lat as number);
        byPlace.set(signal.place, { text: signal.place, x, y, rank });
      }
    }
    return [...byPlace.values()].sort((a, b) => a.rank - b.rank);
  }, [located]);

  const worstAt = useMemo(() => {
    const byPlace = new Map<string, Signal>();
    for (const signal of located) {
      const known = byPlace.get(signal.place);
      if (!known || SEVERITY_ORDER.indexOf(signal.severity) < SEVERITY_ORDER.indexOf(known.severity)) {
        byPlace.set(signal.place, signal);
      }
    }
    return byPlace;
  }, [located]);

  const labels = useMemo(
    () => {
      const px = scale * zoom;
      // The part of the drawing that is on screen: the box, seen through the
      // zoom and shift, with a little margin so names don't touch the edge.
      const halfW = box.w / 2 / px;
      const halfH = box.h / 2 / px;
      const cx = VIEW.width / 2 - view.tx / px;
      const cy = VIEW.height / 2 - view.ty / px;
      const pad = 6 / px;
      const window = box.w > 0 ? { x0: cx - halfW + pad, x1: cx + halfW - pad, y0: cy - halfH + pad, y1: cy + halfH - pad } : undefined;
      return layoutLabels(places.map((p) => ({ key: p.text, ...p })), LABEL_PX / px, VIEW, { zoom, ...(window ? { window } : {}) });
    },
    [places, scale, zoom, view.tx, view.ty, box],
  );
  const selectedPlace = located.find((s) => s.id === selectedId)?.place ?? null;

  const zoomBy = (factor: number) => {
    setMoving(true);
    setView((v) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, v.zoom * factor));
      // Keep the same spot in the middle; back at 1x, back to centre.
      return z === 1 ? { zoom: 1, tx: 0, ty: 0 } : { zoom: z, tx: (v.tx * z) / v.zoom, ty: (v.ty * z) / v.zoom };
    });
  };

  // A landmass is only a speck (drawn as a bold dot) while it is tiny on screen;
  // zoomed into the islands it is just land again.
  const speck = (p: MapPath) => p.islet && p.size * scale * zoom < 5;

  return (
    // cn() so a caller's `rounded-none border-0` actually replaces the defaults;
    // with both in the class list the winner was down to stylesheet order, and the
    // map kept rounded corners inside its square-cornered parent.
    <div ref={frameRef} className={cn("relative overflow-hidden rounded-xl border border-border bg-background", className)}>
      {/* Soft teal glow behind the country. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 55% at 50% 45%, var(--map-glow, rgba(45,212,191,0.12)), transparent 55%)" }}
      />

      {/* Holds the place until the boundary file arrives. */}
      {!mapReady && <Skeleton aria-hidden className="absolute inset-0 rounded-none" />}

      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        className="size-full"
        style={{
          // Only what is left to move on top of the baked view: nothing at rest.
          transform: `translate(${view.tx - (zoom / settled.zoom) * settled.tx}px, ${view.ty - (zoom / settled.zoom) * settled.ty}px) scale(${zoom / settled.zoom})`,
          // While it moves, the map is its own layer, drawn once and scaled. Without
          // this the browser rasterised the whole drawing at the final (up to 9x)
          // size at the start of every zoom-in, which froze the page for about a
          // second. Dropped at the end so it is redrawn sharp at its new size.
          willChange: moving ? "transform" : undefined,
          opacity: mapReady ? 1 : 0,
          transition: reducedMotion ? "none" : !moving ? "opacity .5s ease-out" : "transform .9s cubic-bezier(.22,1,.36,1), opacity .5s ease-out",
        }}
        role="img"
        aria-label={`Map of India showing ${located.length} located signals`}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && event.propertyName === "transform") setMoving(false);
        }}
      >
        <defs>
          {/* The dot texture keeps its on-screen spacing at any zoom. */}
          <pattern id={gridId} width={16 / zoom} height={16 / zoom} patternUnits="userSpaceOnUse">
            <circle cx={1 / zoom} cy={1 / zoom} r={1 / zoom} className="fill-teal-500/25" />
          </pattern>

        </defs>

        <g transform={`translate(${VIEW.width / 2 + settled.tx / scale} ${VIEW.height / 2 + settled.ty / scale}) scale(${settled.zoom}) translate(${-VIEW.width / 2} ${-VIEW.height / 2})`}>
        <LandLayers paths={paths} borders={borders} focusRegion={focusRegion} zoom={zoom} pxScale={scale * zoom} gridId={gridId} />

        {/* The stretch of the country's outline that touches the state in focus,
            as firm as that state's own borders. (A mask over the whole outline
            did this before, but masking at zoom froze the page for a second.) */}
        {focusRegion !== null && coast[normStateName(focusRegion)] && (
          <path
            aria-hidden
            d={coast[normStateName(focusRegion)]}
            fill="none"
            stroke="var(--map-line, #2dd4bf)"
            strokeOpacity={0.95}
            strokeWidth={2.4 / zoom}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* The state in focus: a faint wash. */}
        {focusPath && <path aria-hidden d={focusPath} fill="var(--map-line, #2dd4bf)" fillOpacity={0.1} />}

        {/* Markers and names fade out while the map moves. */}
        <g style={{ opacity: moving ? 0 : 1, transition: reducedMotion ? "none" : "opacity .25s ease-out" }}>
        {located.map((signal) => {
          const [x, y] = project(signal.lng as number, signal.lat as number);
          const tone = SEVERITY[signal.severity];
          const selected = selectedId === signal.id;
                    const pulsing = pulseId === signal.id && !reducedMotion;
          return (
            // A plain <g> with a native <title> for the hover label. A Radix
            // Tooltip with asChild here re-attached its ref on every render in
            // production, which set state each time and looped forever.
            <g
              key={signal.id}
              role="button"
              tabIndex={0}
              // Drawn at the same size on screen whatever the zoom.
              transform={`translate(${x} ${y}) scale(${1 / zoom}) translate(${-x} ${-y})`}
              aria-label={`${signal.title}. ${signal.place}. ${tone.label}`}
                  onClick={() => onSelect(signal)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(signal);
                    }
                  }}
              className="cursor-pointer outline-none focus-visible:[&>circle:last-of-type]:stroke-teal-300"
            >
              <title>{signal.title}</title>
              {/* An invisible 44px target around the small marker. */}
              <circle cx={x} cy={y} r={22 / scale} fill="transparent" />
                  {/* Halo for the worst signals, and a dashed ring so they
                      read as urgent without relying on colour alone. */}
                  {signal.severity === "critical" && (
                    <>
                      <circle cx={x} cy={y} r={26} fill={tone.glow} />
                      <circle
                        cx={x}
                        cy={y}
                        r={16}
                        fill="none"
                        stroke={tone.marker}
                        strokeOpacity={0.7}
                        strokeWidth={1.4}
                        strokeDasharray="4 4"
                      />
                    </>
                  )}
                  {pulsing && (
                    <circle cx={x} cy={y} r={10} fill="none" stroke={tone.marker} strokeWidth={2}>
                      <animate attributeName="r" from="8" to="34" dur="1.4s" repeatCount="3" />
                      <animate attributeName="opacity" from="0.9" to="0" dur="1.4s" repeatCount="3" />
                    </circle>
                  )}
                  <circle cx={x} cy={y} r={selected ? 9 : 7} fill={tone.marker} />
                  <circle cx={x} cy={y} r={selected ? 13 : 10} fill="none" stroke={tone.marker} strokeOpacity={0.5} strokeWidth={2} />
            </g>
          );
        })}

        {/* Names drawn last so they sit above every marker. */}
        {labels.map((label) => {
          const isSelected = label.text === selectedPlace;
          return (
            // Clicking a name opens the same signal as its marker (the
            // place's most severe one). Keyboard users already have the markers.
            <g
              key={label.key}
              aria-hidden
              className="cursor-pointer"
              onClick={() => {
                const signal = worstAt.get(label.text);
                if (signal) onSelect(signal);
              }}
            >
              <text
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                className="fill-foreground font-semibold"
                style={{
                  fontSize: (isSelected ? LABEL_PX + 2 : LABEL_PX) / (scale * zoom),
                  paintOrder: "stroke",
                  stroke: "var(--card)",
                  strokeWidth: 6 / (scale * zoom),
                  strokeLinejoin: "round",
                }}
              >
                {label.text}
              </text>
            </g>
          );
        })}
        </g>
        </g>
      </svg>

      <p className="sr-only">{breadcrumb}</p>

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3">
        {SEVERITY_ORDER.map((level) => (
          <span key={level} className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ background: SEVERITY[level].marker }} />
            {SEVERITY[level].label}
          </span>
        ))}
      </div>

      <div className="absolute right-3 bottom-3 flex flex-col items-end gap-1">
        <ZoomButton label="Zoom in" icon={Plus} factor={1.3} onZoom={zoomBy} />
        {/* While a state is chosen, a way back out to the whole country, on the
            same row as zoom-out and to its left. */}
        <div className="flex items-center gap-2">
          {region !== "All India" && onResetRegion && (
            <button
              type="button"
              onClick={onResetRegion}
              aria-label="Show all of India"
              className="relative flex h-7 items-center gap-1.5 rounded-md border border-border bg-card/80 px-2.5 font-mono text-[10px] tracking-[0.15em] text-muted-foreground backdrop-blur-sm transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 after:absolute after:-inset-1.5 after:content-[''] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2"
            >
              <Undo2 aria-hidden className="size-3.5" />
              ALL INDIA
            </button>
          )}
          <ZoomButton label="Zoom out" icon={Minus} factor={1 / 1.3} onZoom={zoomBy} />
        </div>
      </div>
    </div>
  );
}
