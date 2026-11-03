"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "@/lib/monitor/categories";
import { useStageHeight } from "@/lib/monitor/useStageHeight";
import { useIsDesktop } from "@/lib/monitor/useIsDesktop";
import { useMonitorFeed } from "@/lib/monitor/useMonitorFeed";
import { useSignalFilters } from "@/lib/monitor/useSignalFilters";
import type { CategoryId, Signal } from "@/lib/monitor/types";
import { PanelGrid } from "./PanelGrid";
import { DataCarousel } from "./DataCarousel";
import { IndiaMap } from "./IndiaMap";
import { LayersPanel, MapHeader, MobileControls, TimeRangeBox } from "./MapControls";
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
  // The list scrolls inside its own box on a phone too, so a new row can
  // never push the page around; it just waits behind the pill unless the
  // reader is at the top of the list.
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
  const layout = useIsDesktop();
  const desktop = layout === true;
  const stageHeight = useStageHeight();
  // One loader for the whole page: the dashboard mounts underneath it (so its
  // data and the map outline load in the background) and the loader lifts
  // once both are in, instead of every panel showing its own skeleton.
  const [mapLoaded, setMapLoaded] = useState(false);
  const onMapLoaded = useCallback(() => setMapLoaded(true), []);
  const loading = layout === null || !feed.ready || !mapLoaded;
  const [loaderGone, setLoaderGone] = useState(false);
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => setLoaderGone(true), 500);
    return () => clearTimeout(timer);
  }, [loading]);


  const visible = useMemo(() => filters.apply(feed.signals), [filters, feed.signals]);

  const breadcrumb = useMemo(() => {
    const region = filters.region === "All India" ? "ALL INDIA" : filters.region.toUpperCase();
    const named = [...filters.active]
      .map((id) => CATEGORIES.find((c) => c.id === id)?.name.toUpperCase())
      .filter(Boolean)
      .join(", ");
    const cats = filters.allOn ? "ALL CATEGORIES" : named || "NO CATEGORIES";
    return `${region} / ${cats} · ${visible.length} SIGNAL${visible.length === 1 ? "" : "S"}`;
  }, [filters.region, filters.allOn, filters.active, visible.length]);

  // Three signals sharing a category or a place, for the detail's footer.
  const related = useMemo(() => {
    if (!selected) return [];
    return feed.signals
      .filter((s) => s.id !== selected.id && (s.category === selected.category || s.state === selected.state))
      .slice(0, 3);
  }, [selected, feed.signals]);

  // The screen width isn't known until after mount; showing either layout
  // before then makes the page jump, so the loader holds the place. It is
  // always the second child, so it stays mounted from first paint to the
  // end and its shimmer never restarts.
  return (
    <>
    {layout !== null && (
    <TooltipProvider delayDuration={200}>
      {/* Desktop is laid out against the height the window had at this width
          (see useStageHeight); a shorter window scrolls rather than squeezes. */}
      <ScrollArea className="h-[100svh] bg-background lg:h-screen" viewportClassName="[&>div]:block!">
      <div
        className="flex h-[100svh] flex-col overflow-hidden bg-background lg:h-(--stage-h,100vh)"
        style={desktop && stageHeight ? ({ "--stage-h": `${stageHeight}px` } as React.CSSProperties) : undefined}
      >
        <MonitorNav
          signals={feed.signals}
          onPickSignal={openSignal}
          onPickCategory={(id: CategoryId) => filters.only(id)}
          onPickRegion={filters.setRegion}
        />

        {/* Desktop: the map and its conditions row, beside the signals list.
            Exactly one viewport tall. */}
        {desktop && (
        <div id="main" role="main" tabIndex={-1} className="relative flex min-h-0 flex-1 gap-3 px-3 pt-3 outline-none">
          <section aria-label="Map" className="flex min-w-0 flex-[58] flex-col overflow-hidden rounded-xl border border-teal-500/50 bg-card/40 shadow-(--shadow-card)">
            <MapHeader filters={filters} count={visible.length} />
            <div className="relative min-h-0 flex-1">
              <IndiaMap
                className="size-full rounded-none border-0"
                signals={visible}
                selectedId={selected?.id ?? null}
                onSelect={openSignal}
                pulseId={feed.lastInsertedId}
                breadcrumb={breadcrumb}
                onLoaded={onMapLoaded}
                region={filters.region}
                onResetRegion={() => filters.setRegion("All India")}
              />
              <TimeRangeBox filters={filters} />
              <LayersPanel filters={filters} signals={visible} />
            </div>
          </section>

          <ScrollArea className="-m-1.5 min-w-0 flex-[42]" viewportClassName="overscroll-contain p-1.5 [&>div]:block!">
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
          </ScrollArea>

        </div>
        )}

        {/* Mobile: one column, the page scrolls. */}
        {!desktop && (
        <div id="main" role="main" tabIndex={-1} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 outline-none">
          <div className="scroll-fade-x flex shrink-0 gap-1.5 overflow-x-auto pb-1 [--scroll-fade:1.5rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => filters.clear()}
              aria-pressed={filters.allOn}
              className={`flex min-h-10 shrink-0 items-center rounded-full border px-3 font-mono text-[10px] tracking-[0.15em] transition-colors ${
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
                  className={`flex min-h-10 shrink-0 items-center rounded-full border px-3 font-mono text-[10px] tracking-[0.15em] transition-colors ${
                    on ? "border-teal-500/50 bg-teal-500/10 text-teal-400" : "border-border text-muted-foreground"
                  }`}
                >
                  {meta.name.toUpperCase()}
                </button>
              );
            })}
          </div>

          <MobileControls filters={filters} />

          <IndiaMap
            className="h-[350px] shrink-0"
            signals={visible}
            selectedId={selected?.id ?? null}
            onSelect={openSignal}
            pulseId={feed.lastInsertedId}
            breadcrumb={breadcrumb}
            onLoaded={onMapLoaded}
                region={filters.region}
                onResetRegion={() => filters.setRegion("All India")}
          />

          <SignalsPanel
            className="h-[420px] shrink-0"
            signals={visible}
            ready={feed.ready}
            filters={filters}
            selectedId={selected?.id ?? null}
            onSelect={openSignal}
            queuedCount={feed.queued.length}
            onReleaseQueued={feed.releaseQueued}
            viewportRef={listViewportRef}
          />

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

          {/* Tall enough for the tallest card (Markets, about 206px) plus the
              carousel's own header, so no card is cut off at the bottom. */}
          <DataCarousel className="h-[264px] shrink-0" cards={feed.cards} ready={feed.ready} cardWidth={280} />
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
          <a href="/privacy" className="relative ml-auto hover:text-foreground after:absolute after:-inset-x-3 after:-inset-y-3 after:content-['']">PRIVACY</a>
        </footer>
      </div>
      </ScrollArea>
    </TooltipProvider>
    )}
    {!loaderGone && <MonitorSkeleton fading={!loading} />}
    </>
  );
}

export function MonitorSkeleton({ fading = false }: { fading?: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-background transition-opacity duration-500 motion-reduce:transition-none ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-busy={!fading}
      aria-label="Loading the dashboard"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="hidden h-8 max-w-md flex-1 lg:block" />
        <Skeleton className="size-8 rounded-full" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pt-3 pb-3 lg:flex-row lg:pb-0">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-[58]">
          <Skeleton className="h-8 w-full shrink-0 lg:hidden" />
          <Skeleton className="h-[350px] shrink-0 rounded-xl lg:h-full lg:flex-1" />
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:flex-[42]">
          <Skeleton className="h-[260px] shrink-0 rounded-xl lg:h-[440px]" />
          <div className="hidden grid-cols-2 gap-3 lg:grid">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
