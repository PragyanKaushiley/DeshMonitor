"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "@/lib/monitor/categories";
import { useIsDesktop } from "@/lib/monitor/useIsDesktop";
import { useMonitorFeed } from "@/lib/monitor/useMonitorFeed";
import { useSignalFilters } from "@/lib/monitor/useSignalFilters";
import type { CategoryId, Signal } from "@/lib/monitor/types";
import { PanelGrid } from "./PanelGrid";
import { DataCarousel } from "./DataCarousel";
import { IndiaMap } from "./IndiaMap";
import { LayersPanel, MapHeader, TimeRangeBox } from "./MapControls";
import { MonitorNav } from "./MonitorNav";
import { SignalDetail } from "./SignalDetail";
import { SignalsPanel } from "./SignalsPanel";

// The dashboard. Desktop fills the viewport exactly — rail, map over the
// data carousel, and the signals panel — and never scrolls the page; below
// 768px the same pieces stack and the page scrolls normally.

export function MonitorDashboard() {
  // The signals list's scroll container. A new signal may only push the
  // list down while it is at the top; otherwise it queues behind the pill.
  const listViewportRef = useRef<HTMLDivElement>(null);
  const canInsert = useCallback(() => (listViewportRef.current?.scrollTop ?? 0) < 8, []);
  const feed = useMonitorFeed(canInsert);
  const filters = useSignalFilters();
  const [selected, setSelected] = useState<Signal | null>(null);
  // The detail is opened from a row, a marker or a related card rather than
  // from a Radix trigger, so there is nothing for it to hand focus back to
  // on close — remember the opener and restore it here.
  const openerRef = useRef<HTMLElement | null>(null);
  const openSignal = useCallback((signal: Signal) => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && !active.closest("[role=dialog]")) openerRef.current = active;
    setSelected(signal);
  }, []);
  // Radix would hand focus to the dialog's trigger, and there isn't one, so
  // the detail calls this from its close handler instead.
  const restoreFocus = useCallback(() => {
    const opener = openerRef.current;
    openerRef.current = null;
    // The row may have re-rendered while the detail was open, so prefer a
    // fresh lookup by id and fall back to the remembered element.
    const id = opener?.getAttribute("data-signal-id");
    const target = (id && document.querySelector<HTMLElement>(`[data-signal-id="${id}"]`)) || opener;
    target?.focus({ preventScroll: true });
  }, []);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const layout = useIsDesktop();
  const desktop = layout === true;


  const visible = useMemo(() => filters.apply(feed.signals), [filters, feed.signals]);

  const breadcrumb = useMemo(() => {
    const region = filters.region === "All India" ? "ALL INDIA" : filters.region.toUpperCase();
    const cats = filters.allOn
      ? "ALL CATEGORIES"
      : [...filters.active]
          .map((id) => CATEGORIES.find((c) => c.id === id)?.name.toUpperCase())
          .filter(Boolean)
          .join(", ");
    return `${region} / ${cats} · ${visible.length} SIGNAL${visible.length === 1 ? "" : "S"}`;
  }, [filters.region, filters.allOn, filters.active, visible.length]);

  // Three signals sharing a category or a place, for the detail's footer.
  const related = useMemo(() => {
    if (!selected) return [];
    return feed.signals
      .filter((s) => s.id !== selected.id && (s.category === selected.category || s.state === selected.state))
      .slice(0, 3);
  }, [selected, feed.signals]);

  const mobileSignals = mobileExpanded ? visible : visible.slice(0, 4);

  // The screen width isn't known until after mount; showing either layout
  // before then makes the page jump, so a skeleton holds the place.
  if (layout === null) return <MonitorSkeleton />;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-[100svh] flex-col overflow-hidden bg-background md:h-screen">
        <MonitorNav
          signals={feed.signals}
          onPickSignal={openSignal}
          onPickCategory={(id: CategoryId) => filters.only(id)}
          onPickRegion={filters.setRegion}
        />

        {/* Desktop: the map and its conditions row, beside the signals list.
            Exactly one viewport tall. */}
        {desktop && (
        <div className="flex min-h-0 flex-1 gap-3 px-3 pt-3">
          <section aria-label="Map" className="flex min-w-0 flex-[58] flex-col overflow-hidden rounded-xl border border-teal-500/50 bg-card/40 shadow-[0_0_0_1px_rgba(45,212,191,0.12),0_0_24px_rgba(45,212,191,0.08)]">
            <MapHeader filters={filters} count={visible.length} />
            <div className="relative min-h-0 flex-1">
              <IndiaMap
                className="size-full rounded-none border-0"
                signals={visible}
                selectedId={selected?.id ?? null}
                onSelect={openSignal}
                pulseId={feed.lastInsertedId}
                breadcrumb={breadcrumb}
              />
              <TimeRangeBox filters={filters} />
              <LayersPanel filters={filters} signals={visible} />
            </div>
          </section>

          <div className="min-w-0 flex-[42] overflow-y-auto overscroll-contain pr-1">
            <div className="flex flex-col gap-3">
              <SignalsPanel
                className="h-[440px] shrink-0"
                signals={visible}
                ready={feed.ready}
                filters={filters}
                selectedId={selected?.id ?? null}
                onSelect={openSignal}
                queuedCount={feed.queued.length}
                onReleaseQueued={feed.releaseQueued}
                viewportRef={listViewportRef}
              />
              <PanelGrid cards={feed.cards} ready={feed.ready} />
            </div>
          </div>
        </div>
        )}

        {/* Mobile: one column, the page scrolls. */}
        {!desktop && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <div className="scroll-fade-x flex shrink-0 gap-1.5 overflow-x-auto pb-1 [--scroll-fade:1.5rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => filters.clear()}
              aria-pressed={filters.allOn}
              className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.15em] transition-colors ${
                filters.allOn ? "border-teal-500/50 bg-teal-500/10 text-teal-400" : "border-border text-muted-foreground"
              }`}
            >
              ALL
            </button>
            {CATEGORIES.map((meta) => {
              const on = !filters.allOn && filters.active.has(meta.id);
              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => (on && filters.active.size === 1 ? filters.clear() : filters.only(meta.id))}
                  aria-pressed={on}
                  className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.15em] transition-colors ${
                    on ? "border-teal-500/50 bg-teal-500/10 text-teal-400" : "border-border text-muted-foreground"
                  }`}
                >
                  {meta.name.toUpperCase()}
                </button>
              );
            })}
          </div>

          <IndiaMap
            className="h-[350px] shrink-0"
            signals={visible}
            selectedId={selected?.id ?? null}
            onSelect={openSignal}
            pulseId={feed.lastInsertedId}
            breadcrumb={breadcrumb}
          />

          <SignalsPanel
            className="shrink-0"
            signals={mobileSignals}
            ready={feed.ready}
            filters={filters}
            selectedId={selected?.id ?? null}
            onSelect={openSignal}
            queuedCount={feed.queued.length}
            onReleaseQueued={feed.releaseQueued}
            viewportRef={listViewportRef}
          />

          {feed.ready && visible.length > mobileSignals.length && (
            <button
              type="button"
              onClick={() => setMobileExpanded(true)}
              className="shrink-0 rounded-lg border border-border py-2.5 font-mono text-[10px] tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              VIEW ALL {visible.length} SIGNALS →
            </button>
          )}
          {!filters.allOn && (
            <button
              type="button"
              onClick={() => filters.clear()}
              className="shrink-0 rounded-lg border border-teal-500/30 bg-teal-500/5 py-2.5 font-mono text-[10px] tracking-[0.2em] text-teal-400"
            >
              SHOWING{" "}
              {[...filters.active]
                .map((id) => CATEGORIES.find((c) => c.id === id)?.name.toUpperCase())
                .join(", ")}{" "}
              · CLEAR FILTER
            </button>
          )}

          <DataCarousel className="h-[190px] shrink-0" cards={feed.cards} ready={feed.ready} cardWidth={280} />
        </div>
        )}

        <SignalDetail
          signal={selected}
          related={related}
          onSelect={openSignal}
          onClose={() => setSelected(null)}
          onRestoreFocus={restoreFocus}
        />

        <footer className="flex shrink-0 items-center gap-4 px-4 py-1.5 font-mono text-[9px] tracking-[0.2em] text-muted-foreground/80">
          <span>SAMPLE DATA</span>
          <span className="hidden sm:inline">{visible.length} SIGNALS · {filters.window} · {filters.region.toUpperCase()}</span>
          <a href="/privacy" className="ml-auto hover:text-foreground">PRIVACY</a>
        </footer>
      </div>
    </TooltipProvider>
  );
}

export function MonitorSkeleton() {
  return (
    <div className="flex h-[100svh] flex-col overflow-hidden bg-background md:h-screen" aria-busy="true" aria-label="Loading the dashboard">
      <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="hidden h-8 max-w-md flex-1 md:block" />
        <Skeleton className="size-8 rounded-full" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pt-3 pb-3 md:flex-row md:pb-0">
        <div className="flex min-w-0 flex-col gap-3 md:flex-[58]">
          <Skeleton className="h-8 w-full shrink-0 md:hidden" />
          <Skeleton className="h-[350px] shrink-0 rounded-xl md:h-full md:flex-1" />
        </div>

        <div className="flex min-w-0 flex-col gap-3 md:flex-[42]">
          <Skeleton className="h-[260px] shrink-0 rounded-xl md:h-[440px]" />
          <div className="hidden grid-cols-2 gap-3 md:grid">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
