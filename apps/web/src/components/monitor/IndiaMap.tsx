"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { SEVERITY, SEVERITY_ORDER } from "@/lib/monitor/categories";
import { layoutLabels } from "@/lib/monitor/labels";
import type { Signal } from "@/lib/monitor/types";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";

// India drawn straight from the boundary GeoJSON the landing page already
// ships — a plain equirectangular projection with longitude squeezed by
// cos(22.5°), which is close enough over India's latitudes and needs no
// mapping library.

const BOUNDARY = "/landing/globe/india-boundary.geojson";
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

// Name size on screen, in pixels.
const LABEL_PX = 11;

interface MapPath {
  d: string;
  islet: boolean;
}

function toPaths(geo: GeoJson): MapPath[] {
  const paths: MapPath[] = [];
  const addRing = (ring: Ring) => {
    if (ring.length < 3) return;
    const points = ring.map(([lng, lat]) => project(lng, lat));
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const islet = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < ISLET_SIZE;
    const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    paths.push({ d: `${d} Z`, islet });
  };

  for (const feature of geo.features) {
    const { type, coordinates } = feature.geometry;
    if (type === "Polygon") (coordinates as Ring[]).forEach(addRing);
    else if (type === "MultiPolygon") (coordinates as Ring[][][]).forEach((poly) => poly.forEach((r) => addRing(r as unknown as Ring)));
  }
  return paths;
}

export function IndiaMap({
  signals,
  selectedId,
  onSelect,
  pulseId,
  breadcrumb,
  className = "",
}: {
  signals: Signal[];
  selectedId: string | null;
  onSelect: (signal: Signal) => void;
  pulseId: string | null;
  breadcrumb: string;
  className?: string;
}) {
  const [paths, setPaths] = useState<MapPath[] | null>(null);
  const [zoom, setZoom] = useState(1);
  const reducedMotion = usePrefersReducedMotion();
  const gridId = useId();
  const failed = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  // On-screen pixels per drawing unit, so names stay a readable size on a
  // phone as well as on a wide screen.
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box && box.width > 0 && box.height > 0) setScale(Math.min(box.width / VIEW.width, box.height / VIEW.height));
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(BOUNDARY)
      .then((res) => res.json())
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

  const labels = useMemo(
    () => layoutLabels(places.map((p) => ({ key: p.text, ...p })), LABEL_PX / scale, VIEW),
    [places, scale],
  );
  const selectedPlace = located.find((s) => s.id === selectedId)?.place ?? null;

  return (
    <div ref={frameRef} className={`relative overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur-sm ${className}`}>
      {/* Soft teal glow behind the country. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 55% at 50% 45%, var(--map-glow, rgba(45,212,191,0.12)), transparent 70%)" }}
      />

      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        className="size-full"
        style={{ transform: `scale(${zoom})`, transition: reducedMotion ? "none" : "transform .35s ease-out" }}
        role="img"
        aria-label={`Map of India showing ${located.length} located signals`}
      >
        <defs>
          <pattern id={gridId} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="fill-teal-500/25" />
          </pattern>

        </defs>

        {paths && paths.length > 0 && (
          <>
            {paths.map(({ d, islet }, i) => (
              <path
                key={i}
                d={d}
                // The dot grid is the land's own fill. A clip path over the whole
                // drawing made every theme change repaint for over a second.
                fill={islet ? "var(--map-line, #2dd4bf)" : `url(#${gridId})`}
                stroke="var(--map-line, #2dd4bf)"
                strokeOpacity={islet ? 0.9 : 0.55}
                strokeWidth={islet ? 3.5 : 1.6}
                strokeLinejoin="round"
              />
            ))}
          </>
        )}

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
            <g key={label.key} className="pointer-events-none">
              <text
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                className="fill-foreground font-medium"
                style={{
                  fontSize: (isSelected ? LABEL_PX + 2 : LABEL_PX) / scale,
                  paintOrder: "stroke",
                  stroke: "var(--card)",
                  strokeWidth: 3 / scale,
                  strokeLinejoin: "round",
                }}
              >
                {label.text}
              </text>
            </g>
          );
        })}
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

      <div className="absolute right-3 bottom-3 flex flex-col gap-1">
        {[
          { label: "Zoom in", icon: Plus, delta: 0.2 },
          { label: "Zoom out", icon: Minus, delta: -0.2 },
        ].map(({ label, icon: Icon, delta }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={() => setZoom((z) => Math.min(2.2, Math.max(1, Number((z + delta).toFixed(2)))))}
            className="grid size-7 place-items-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur-sm transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <Icon aria-hidden className="size-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
