"use client";

import { useReducedMotion } from "motion/react";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { DataCard } from "@/lib/monitor/types";
import { Bars, Change, MiniCard, Sparkline } from "./MiniCard";

// One body per data family, each in the shape that family is actually
// published in — an index with a sparkline, bars of millimetres, a load
// curve, a table of magnitudes.

// AQI bands, as CPCB publishes them.
function aqiColor(value: number): string {
  if (value >= 400) return "var(--sev-critical, #f87171)";
  if (value >= 300) return "var(--sev-critical, #fb923c)";
  if (value >= 200) return "var(--sev-warning, #fbbf24)";
  if (value >= 100) return "var(--sev-warning, #a3e635)";
  return "var(--sev-watch, #2dd4bf)";
}

function reservoirColor(value: number): string {
  if (value < 30) return "var(--sev-critical, #f87171)";
  if (value < 55) return "var(--sev-warning, #fbbf24)";
  return "var(--sev-watch, #2dd4bf)";
}

function delayColor(value: number): string {
  if (value >= 35) return "var(--sev-critical, #f87171)";
  if (value >= 18) return "var(--sev-warning, #fbbf24)";
  return "var(--sev-watch, #2dd4bf)";
}

// A figure that rolls to its new value as the feed updates. Whole numbers
// above 100 and two decimals below, matching how the feed rounds them.
function Money({ value, decimals: fixed }: { value: number; decimals?: number }) {
  const reduced = useReducedMotion();
  const decimals = fixed ?? (Math.abs(value) >= 100 ? 0 : 2);
  if (reduced) return <>{value.toLocaleString("en-IN", { maximumFractionDigits: decimals })}</>;
  return <NumberTicker value={value} decimalPlaces={decimals} locale="en-IN" />;
}

function Rows({ rows }: { rows: DataCard["rows"] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((row) => (
        // The value and its change travel together: when they don't fit
        // beside the label (a small card), the pair drops to its own line
        // instead of the label and the unit each wrapping.
        <li key={row.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-mono text-[10px] tracking-[0.15em] whitespace-nowrap text-muted-foreground">
            {row.label}
          </span>
          <span className="ml-auto flex items-baseline gap-2 whitespace-nowrap">
            <span className="font-mono text-[11px] tabular-nums text-foreground">
              <Money value={row.value} />
              {row.note ? <span className="ml-1 text-muted-foreground">{row.note}</span> : null}
            </span>
            <Change value={row.change} />
          </span>
        </li>
      ))}
    </ul>
  );
}

// A 24-hour load curve. Inline SVG, same reasoning as the sparkline.
function LineChart({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * 100} ${44 - ((v - min) / span) * 38}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="h-12 w-full" aria-hidden>
      {[12, 24, 36].map((y) => (
        <line key={y} x1={0} y1={y} x2={100} y2={y} className="stroke-border" strokeWidth={0.5} strokeDasharray="2 3" />
      ))}
      <path d={`${d} L100 48 L0 48 Z`} fill="rgba(45,212,191,0.12)" />
      <path d={d} fill="none" stroke="var(--sev-watch, #2dd4bf)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function DataCardBody({ card }: { card: DataCard }) {
  switch (card.id) {
    case "markets":
      return (
        <MiniCard card={card}>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl leading-none text-foreground tabular-nums">
              {card.headline ? <Money value={Number(card.headline.value.replace(/,/g, ""))} decimals={2} /> : null}
            </span>
            <Change value={card.headline?.change} />
          </div>
          <span className="mt-0.5 font-mono text-[9px] tracking-[0.15em] text-muted-foreground">{card.unit}</span>
          <Sparkline points={card.series} className="my-1" />
          <Rows rows={card.rows} />
        </MiniCard>
      );

    case "economy":
      return (
        <MiniCard card={card}>
          <Rows rows={card.rows} />
        </MiniCard>
      );

    case "weather":
      return (
        <MiniCard card={card}>
          <Bars rows={card.rows} max={200} suffix="mm" />
        </MiniCard>
      );

    case "environment":
      return (
        <MiniCard card={card}>
          <Bars rows={card.rows} max={500} colorFor={aqiColor} />
        </MiniCard>
      );

    case "water":
      return (
        <MiniCard card={card}>
          <Bars rows={card.rows} max={100} colorFor={reservoirColor} suffix="%" />
        </MiniCard>
      );

    case "energy":
      return (
        <MiniCard card={card}>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl leading-none text-foreground tabular-nums">{card.headline?.value}</span>
            <Change value={card.headline?.change} />
          </div>
          <span className="mt-0.5 font-mono text-[9px] tracking-[0.15em] text-muted-foreground">PEAK, LAST 24H</span>
          <LineChart points={card.series} />
        </MiniCard>
      );

    case "transport":
      return (
        <MiniCard card={card}>
          <Bars rows={card.rows} max={60} colorFor={delayColor} suffix="%" />
          <p className="mt-1.5 font-mono text-[9px] tracking-[0.15em] text-muted-foreground">DEPARTURES DELAYED</p>
        </MiniCard>
      );

    case "agriculture":
      return (
        <MiniCard card={card}>
          <Rows rows={card.rows} />
        </MiniCard>
      );

    case "disasters":
      return (
        <MiniCard card={card}>
          <ul className="flex flex-col gap-2">
            {card.rows.map((row) => {
              const magnitude = row.value;
              const tone = magnitude >= 5 ? "text-red-400" : magnitude >= 4 ? "text-amber-400" : "text-teal-400";
              return (
                <li key={row.label} className="flex items-baseline gap-2">
                  <span className={`font-display text-lg leading-none tabular-nums ${tone}`}>
                    {magnitude.toFixed(1)}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">{row.label}</span>
                  <span className="ml-auto shrink-0 font-mono text-[9px] text-muted-foreground">{row.note}</span>
                </li>
              );
            })}
          </ul>
        </MiniCard>
      );
  }
}
