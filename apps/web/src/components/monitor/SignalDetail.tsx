"use client";

import { useEffect, useMemo, useState } from "react";
import { stateRings } from "@/lib/monitor/stateShapes";
import {
  ChartLine,
  ExternalLink,
  FileText,
  Map as MapIcon,
  Phone,
  Share2,
  Shield,
  Star,
  TrainFront,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEVERITY, category } from "@/lib/monitor/categories";
import type { Signal } from "@/lib/monitor/types";

// Everything behind one signal: what we think, why we think it, what you
// can do, and how it got here. A dialog on desktop, a bottom sheet on
// phones, with the same content in both.

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  phone: Phone,
  train: TrainFront,
  map: MapIcon,
  shield: Shield,
  chart: ChartLine,
  file: FileText,
  zap: Zap,
};

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const apply = () => setDesktop(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return desktop;
}

function timeOf(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

function minutesAgo(timestamp: number) {
  return Math.max(1, Math.round((Date.now() - timestamp) / 60_000));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">{children}</h3>;
}

// A bar chart of the signal's own series, in whatever unit it carries.
// `varied` redraws it with its own values, so a second source's chart (the
// sample data only has one series per signal) doesn't repeat the first.
function SeriesChart({ signal, varied = false }: { signal: Signal; varied?: boolean }) {
  const points = useMemo(
    () =>
      varied
        ? signal.series.map((p) => ({ ...p, value: Math.max(1, p.value * (0.4 + Math.random() * 1.1)) }))
        : signal.series,
    [signal.series, varied],
  );
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div>
      <div className="flex h-28 gap-1.5">
        {points.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            {/* The bar's percentage height needs a parent with a definite
                one, which this flex-1 track provides; the label sits under it. */}
            <div className="flex w-full flex-1 items-end">
              <span
                className="w-full rounded-t bg-teal-500/70 transition-[height] duration-500"
                style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}
              />
            </div>
            <span className="truncate font-mono text-[8px] text-muted-foreground">{point.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-1.5 font-mono text-[9px] tracking-[0.15em] text-muted-foreground">{signal.seriesLabel}</p>
    </div>
  );
}

function EvidenceCards({ signal }: { signal: Signal }) {
  // Only the first chart is the signal's own series; later ones are varied.
  const firstChart = signal.evidence.findIndex((e) => e.kind !== "news");
  return (
    <div className="flex flex-col gap-3">
      {signal.evidence.map((item, index) => (
        <div key={item.label} className="rounded-lg border border-border bg-card/60 p-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-teal-400">{item.kind.toUpperCase()}</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">{item.label}</span>
          </div>

          {item.kind === "news" ? (
            <>
              <p className="mt-2 font-display text-2xl leading-none text-foreground">{item.count}</p>
              <p className="font-mono text-[9px] tracking-[0.15em] text-muted-foreground">ARTICLES</p>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {signal.headlines.slice(0, 3).map((headline, i) => (
                  <li key={i} className="flex items-baseline gap-2">
                    <span className="shrink-0 font-mono text-[9px] tracking-[0.15em] text-muted-foreground">
                      {headline.outlet.toUpperCase()}
                    </span>
                    <span className="truncate text-xs text-foreground">{headline.title}</span>
                    <span className="ml-auto shrink-0 font-mono text-[9px] text-muted-foreground">
                      {headline.minutesAgo}m
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-2 font-mono text-[10px] tracking-[0.15em] text-teal-400 underline underline-offset-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
              >
                READ ALL {item.count} →
              </button>
            </>
          ) : (
            <div className="mt-2">
              <SeriesChart signal={signal} varied={index !== firstChart} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const INSET = { width: 400, height: 160, pad: 14 };

// The whole state around the signal, fitted to the box. The longitude is
// squeezed by cos(latitude) so the state keeps its shape.
function MapInset({ signal }: { signal: Signal }) {
  const [rings, setRings] = useState<[number, number][][]>([]);
  const state = signal.state;
  useEffect(() => {
    let cancelled = false;
    stateRings(state).then((r) => {
      if (!cancelled) setRings(r);
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  const shape = useMemo(() => {
    if (signal.lat === null || signal.lng === null || rings.length === 0) return null;
    const k = Math.cos((signal.lat * Math.PI) / 180);
    const pts = rings.flat();
    const xs = pts.map(([lng]) => lng * k);
    const ys = pts.map(([, lat]) => lat);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const scale = Math.min(
      (INSET.width - INSET.pad * 2) / (x1 - x0 || 1),
      (INSET.height - INSET.pad * 2) / (y1 - y0 || 1),
    );
    const ox = (INSET.width - (x1 - x0) * scale) / 2;
    const oy = (INSET.height - (y1 - y0) * scale) / 2;
    const at = (lng: number, lat: number): [number, number] => [ox + (lng * k - x0) * scale, oy + (y1 - lat) * scale];
    const d = rings
      .map((ring) => ring.map(([lng, lat], i) => `${i === 0 ? "M" : "L"}${at(lng, lat).map((n) => n.toFixed(1)).join(" ")}`).join(" ") + " Z")
      .join(" ");
    return { d, marker: at(signal.lng, signal.lat) };
  }, [rings, signal.lat, signal.lng]);

  if (signal.lat === null || signal.lng === null) return null;
  const tone = SEVERITY[signal.severity];
  return (
    <div className="relative h-40 overflow-hidden rounded-lg border border-border bg-background">
      {shape ? (
        <svg viewBox={`0 0 ${INSET.width} ${INSET.height}`} className="size-full" role="img" aria-label={`${signal.place}, ${signal.state}`}>
          <path d={shape.d} fill="var(--card)" stroke="var(--map-line, #2dd4bf)" strokeOpacity={0.7} strokeWidth={1.4} strokeLinejoin="round" />
          <circle cx={shape.marker[0]} cy={shape.marker[1]} r={14} fill={tone.glow} />
          <circle cx={shape.marker[0]} cy={shape.marker[1]} r={4.5} fill={tone.marker} />
        </svg>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="relative grid place-items-center">
            <span className="absolute size-12 rounded-full" style={{ background: tone.glow }} />
            <span className="size-3 rounded-full" style={{ background: tone.marker }} />
          </span>
        </div>
      )}
      <p className="absolute bottom-1.5 left-1.5 rounded bg-background/85 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.15em] text-muted-foreground">
        {signal.place.toUpperCase()} · {signal.state.toUpperCase()} · {signal.lat.toFixed(2)}°N {signal.lng.toFixed(2)}°E
      </p>
    </div>
  );
}

function Actions({ signal }: { signal: Signal }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {signal.actions.map((action) => {
        const Icon = ACTION_ICONS[action.icon] ?? FileText;
        return (
          <li key={action.title}>
            <a
              href={action.href}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/60 p-2.5 transition-colors outline-none hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md border border-teal-500/30 bg-teal-500/10">
                <Icon className="size-4 text-teal-400" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[10px] tracking-[0.15em] text-foreground">
                  {action.title.toUpperCase()}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{action.subtitle}</span>
              </span>
              <ExternalLink aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function Timeline({ signal }: { signal: Signal }) {
  return (
    <ol className="flex flex-col gap-0">
      {signal.timeline.map((entry, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex flex-col items-center">
            <span className={`mt-1 size-2 shrink-0 rounded-full ${SEVERITY[entry.severity].bg}`} />
            {i < signal.timeline.length - 1 && <span className="w-px flex-1 bg-border" />}
          </span>
          <span className="pb-3">
            <span className="block font-mono text-[9px] tracking-[0.15em] text-muted-foreground">{entry.time}</span>
            <span className="block text-xs text-foreground">{entry.text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Summary({ signal }: { signal: Signal }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-3xl leading-tight text-foreground md:text-[44px]">{signal.title}</h2>
      <p className="font-display text-base leading-relaxed text-muted-foreground md:text-lg">{signal.summary}</p>
      <div>
        <div className="flex items-baseline justify-between">
          <SectionLabel>CONFIDENCE</SectionLabel>
          <span className="font-mono text-xs tabular-nums text-foreground">{signal.confidence}%</span>
        </div>
        <Progress
          value={signal.confidence}
          className="mt-1.5 h-1.5 bg-muted [&>*]:bg-linear-to-r [&>*]:from-teal-300 [&>*]:via-teal-500 [&>*]:to-teal-700"
        />
        <p className="mt-1.5 font-mono text-[9px] tracking-[0.15em] text-muted-foreground">
          {signal.evidence.length} INDEPENDENT SOURCE TYPES AGREE
        </p>
      </div>
    </div>
  );
}

function RelatedSignals({ related, onSelect }: { related: Signal[]; onSelect: (s: Signal) => void }) {
  if (related.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>RELATED SIGNALS</SectionLabel>
      <div className="grid gap-2 sm:grid-cols-3">
        {related.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="rounded-lg border border-border bg-card/60 p-2.5 text-left transition-colors outline-none hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <span className={`font-mono text-[9px] tracking-[0.15em] ${SEVERITY[item.severity].text}`}>
              {category(item.category).name.toUpperCase()}
            </span>
            <span className="mt-1 block font-display text-sm leading-snug text-foreground line-clamp-2">{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SignalDetail({
  signal,
  related,
  onSelect,
  onClose,
  onRestoreFocus,
}: {
  signal: Signal | null;
  related: Signal[];
  onSelect: (s: Signal) => void;
  onClose: () => void;
  // Opened from a row, a marker or a card rather than a Radix trigger, so
  // Radix has nothing to hand focus back to; the caller does it instead.
  onRestoreFocus?: () => void;
}) {
  const desktop = useIsDesktop();
  const open = signal !== null;
  if (!signal) return null;

  const tone = SEVERITY[signal.severity];
  const meta = category(signal.category);
  const primaryAction = signal.actions[0];

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className={`rounded-full border ${tone.border} bg-transparent font-mono text-[9px] tracking-[0.15em] ${tone.text}`}>
        {meta.name.toUpperCase()} · {tone.label}
      </Badge>
      <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
        {signal.place.toUpperCase()} · OPENED {timeOf(signal.createdAt)} · UPDATED {minutesAgo(signal.updatedAt)} MIN AGO
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          aria-label="Follow this signal"
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <Star aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Share this signal"
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <Share2 aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );

  const left = (
    <div className="flex flex-col gap-6">
      <Summary signal={signal} />
      <div className="flex flex-col gap-2">
        <SectionLabel>WHY WE THINK THIS</SectionLabel>
        <EvidenceCards signal={signal} />
      </div>
      <RelatedSignals related={related} onSelect={onSelect} />
    </div>
  );

  const right = (
    <div className="flex flex-col gap-5">
      <MapInset signal={signal} />
      <div className="flex flex-col gap-2">
        <SectionLabel>WHAT YOU CAN DO</SectionLabel>
        <Actions signal={signal} />
      </div>
      <div className="flex flex-col gap-2">
        <SectionLabel>HOW IT DEVELOPED</SectionLabel>
        <Timeline signal={signal} />
      </div>
    </div>
  );

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onRestoreFocus?.();
          }}
          showCloseButton
          className="flex h-[88vh] w-[90vw] max-w-none flex-col gap-4 overflow-hidden border border-teal-500/40 bg-card p-6 shadow-[0_0_0_1px_rgba(45,212,191,0.15),0_24px_80px_rgba(0,0,0,0.7)] ring-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">{signal.title}</DialogTitle>
          <DialogDescription className="sr-only">{signal.summary}</DialogDescription>
          {header}
          <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[1fr_380px]">
            <ScrollArea className="min-h-0" viewportClassName="pr-4">
              {left}
            </ScrollArea>
            <ScrollArea className="min-h-0" viewportClassName="pr-2">
              {right}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()} direction="bottom" autoFocus>
      <DrawerContent showHandle className="h-[92vh] gap-3 border-t border-teal-500/40 bg-card px-4 pt-3 pb-4">
        <DrawerTitle className="sr-only">{signal.title}</DrawerTitle>
        <DrawerDescription className="sr-only">{signal.summary}</DrawerDescription>
        {header}
        <Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid w-full shrink-0 grid-cols-4 bg-muted/50">
            {["Summary", "Evidence", "Map", "Act"].map((label) => (
              <TabsTrigger
                key={label}
                value={label.toLowerCase()}
                className="font-mono text-[10px] tracking-[0.15em] data-[state=active]:bg-background data-[state=active]:text-teal-400"
              >
                {label.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollArea className="min-h-0 flex-1" viewportClassName="pt-3">
            <TabsContent value="summary" className="m-0">
              <div className="flex flex-col gap-6">
                <Summary signal={signal} />
                <RelatedSignals related={related} onSelect={onSelect} />
              </div>
            </TabsContent>
            <TabsContent value="evidence" className="m-0">
              <EvidenceCards signal={signal} />
            </TabsContent>
            <TabsContent value="map" className="m-0">
              {signal.lat === null ? (
                <p className="py-8 text-center font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                  ALL INDIA · NO LOCATION
                </p>
              ) : (
                <MapInset signal={signal} />
              )}
            </TabsContent>
            <TabsContent value="act" className="m-0">
              <div className="flex flex-col gap-5">
                <Actions signal={signal} />
                <div className="flex flex-col gap-2">
                  <SectionLabel>HOW IT DEVELOPED</SectionLabel>
                  <Timeline signal={signal} />
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        {primaryAction && (
          <a
            href={primaryAction.href}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/10 py-3 font-mono text-[11px] tracking-[0.2em] text-teal-400 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            {primaryAction.title.toUpperCase()} {primaryAction.subtitle}
          </a>
        )}
      </DrawerContent>
    </Drawer>
  );
}
