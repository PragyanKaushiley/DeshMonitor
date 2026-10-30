"use client";

import { Maximize2 } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { CATEGORIES } from "@/lib/monitor/categories";
import type { DataCard, DataCardId } from "@/lib/monitor/types";

// Shared shell for every card in the "MORE DATA" carousel: icon, mono title,
// a meta in the corner, and a maximise affordance. Each family fills the
// body with whatever shape it publishes in.

const ICON_FOR: Record<DataCardId, DataCardId> = {
  markets: "markets",
  economy: "economy",
  weather: "weather",
  environment: "environment",
  water: "water",
  energy: "energy",
  transport: "transport",
  agriculture: "agriculture",
  disasters: "disasters",
};

export function MiniCard({
  card,
  children,
  onExpand,
}: {
  card: DataCard;
  children: React.ReactNode;
  onExpand?: () => void;
}) {
  const meta = CATEGORIES.find((c) => c.id === ICON_FOR[card.id]);
  const Icon = meta?.icon;

  return (
    <MagicCard
      className="h-full rounded-xl border border-border bg-card/80"
      gradientColor="var(--spot, #1f2a2a)"
      gradientFrom="var(--sev-watch, #2dd4bf)"
      gradientTo="#0f766e"
      gradientSize={160}
    >
    <article className="flex h-full flex-col gap-2.5 p-3">
      <header className="flex items-start gap-2">
        {Icon && <Icon className="mt-px size-3.5 shrink-0 text-muted-foreground" />}
        <h3 className="font-mono text-[10px] tracking-[0.2em] text-foreground">{card.title}</h3>
        <span className="ml-auto shrink-0 font-mono text-[9px] tracking-[0.15em] text-muted-foreground">{card.meta}</span>
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            aria-label={`Expand ${card.title}`}
            className="shrink-0 rounded text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <Maximize2 aria-hidden className="size-3" />
          </button>
        )}
      </header>
      <div className="flex min-h-0 flex-1 flex-col justify-center">{children}</div>
    </article>
    </MagicCard>
  );
}

export function Change({ value }: { value: number | undefined }) {
  if (value === undefined) return null;
  const up = value >= 0;
  return (
    <span className={`font-mono text-[10px] tabular-nums ${up ? "text-teal-400" : "text-red-400"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

// A tiny sparkline. Inline SVG rather than a chart library: these are 40px
// tall and redraw every few seconds.
export function Sparkline({ points, className = "" }: { points: number[]; className?: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * 100} ${28 - ((v - min) / span) * 24}`)
    .join(" ");
  const rising = (points.at(-1) ?? 0) >= (points[0] ?? 0);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={`h-8 w-full ${className}`} aria-hidden>
      <path d={`${d} L100 30 L0 30 Z`} fill={rising ? "rgba(45,212,191,0.14)" : "rgba(248,113,113,0.12)"} />
      <path d={d} fill="none" stroke={rising ? "var(--sev-watch, #2dd4bf)" : "var(--sev-critical, #f87171)"} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Horizontal bars, used by the rain, AQI, reservoir and delay cards.
export function Bars({
  rows,
  max,
  colorFor,
  suffix = "",
}: {
  rows: { label: string; value: number; note?: string }[];
  max: number;
  colorFor?: (value: number) => string;
  suffix?: string;
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[4.5rem_1fr_2.75rem] items-center gap-2">
          <span className="truncate text-[11px] text-muted-foreground">{row.label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${Math.min(100, (row.value / max) * 100)}%`,
                background: colorFor ? colorFor(row.value) : "var(--sev-watch, #2dd4bf)",
              }}
            />
          </span>
          <span className="text-right font-mono text-[10px] tabular-nums text-foreground">
            {Math.round(row.value)}
            {suffix}
          </span>
        </li>
      ))}
    </ul>
  );
}
